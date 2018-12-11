(ns dirac.options.model
  (:require [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.ext.storage :as storage]
            [chromex.protocols.chrome-storage-area :as chrome-storage-area]
            [dirac.options.logging :refer [error info log warn]]
            [dirac.shared.async :refer [<! close! go go-channel]]
            [oops.core :refer [gcall oapply ocall oget]]))

; we keep cached-options atom synced with values in storage
; we persist all options in local storage under "options" key as JSON string

(def default-options
  {:target-url                "http://localhost:9222"
   :open-as                   "panel"
   :enable-repl               true
   :enable-parinfer           true
   :enable-friendly-locals    true
   :enable-clustered-locals   true
   :inline-custom-formatters  true
   :welcome-message           true
   :clean-urls                true
   :beautify-function-names   true
   :link-actions              true
   :user-frontend-url-params  nil})

(defonce cached-options (atom nil))

(defonce ^:dynamic *initialized* false)
(defonce ^:dynamic *auto-sync* true)

; -- public API -------------------------------------------------------------------------------------------------------------

(defn get-options []
  {:pre [*initialized*]}
  @cached-options)

(defn get-option [key]
  {:pre [*initialized*]}
  (key (get-options)))

(defn set-option! [key value]
  {:pre [*initialized*]}
  (log "set-option!" key value)
  (swap! cached-options assoc key value))                                                                                     ; will trigger on-cached-options-change!

(defn set-options! [options]
  {:pre [*initialized*]}
  (log "set-options!" options)
  (swap! cached-options merge options))                                                                                       ; will trigger on-cached-options-change!

(defn reset-options! [options]
  {:pre [*initialized*]}
  (log "reset-options!" options)
  (reset! cached-options options))                                                                                            ; will trigger on-cached-options-change!

(defn reset-to-defaults! []
  (reset-options! default-options))

; -- serialization ----------------------------------------------------------------------------------------------------------

(defn serialize-options [options]
  (let [json (clj->js options)]
    (gcall "JSON.stringify" json)))

(defn unserialize-options [serialized-options]
  (assert (or (string? serialized-options) (object? serialized-options))
          (str "unexpected serialized-options of type " (type serialized-options) ": " (pr-str serialized-options)))
  (let [json (if (string? serialized-options)
               (gcall "JSON.parse" serialized-options)
               serialized-options)]
    (js->clj json :keywordize-keys true)))

; -- read/write -------------------------------------------------------------------------------------------------------------

(defn write-options! [options]
  {:pre [*initialized*]}
  (info "write options:" options)
  (let [serialized-options (serialize-options options)
        local-storage (storage/get-local)]
    (chrome-storage-area/set local-storage #js {"options" serialized-options})))                                                ; will trigger on-changed event and a call to reload-options!, which is fine

(defn on-cached-options-change! [new-options]
  (when *auto-sync*
    (write-options! new-options)))

(defn reset-cached-options-without-sync! [options]
  {:pre [*initialized*]}
  (binding [*auto-sync* false]
    (reset! cached-options options)))

(defn parse-options [serialized-options]
  (let [options (if (some? serialized-options)
                  (unserialize-options serialized-options))]
    (merge default-options options)))                                                                                         ; merge is important for upgrading options schema between versions

(defn go-read-options []
  (go
    (let [local-storage (storage/get-local)
          [[items] _error] (<! (chrome-storage-area/get local-storage "options"))
          options (parse-options (oget items "?options"))]
      (info "read options:" options)
      options)))

(defn reload-options! [serialized-options]
  {:pre [*initialized*]}
  (let [options (parse-options serialized-options)]
    (info "reload options:" options)
    (reset-cached-options-without-sync! options)))

; -- events -----------------------------------------------------------------------------------------------------------------

(defn go-handle-on-changed! [changes area-name]
  (go
    (when (= area-name "local")
      (reload-options! (oget changes "options.newValue")))))

(defn go-process-chrome-event [event]
  (log "got chrome event" event)
  (let [[event-id event-args] event]
    (case event-id
      ::storage/on-changed (apply go-handle-on-changed! event-args)
      (go))))

(defn go-run-chrome-event-loop! [chrome-event-channel]
  (go
    (log "entering event loop")
    (loop []
      (when-let [event (<! chrome-event-channel)]
        (<! (go-process-chrome-event event))
        (recur)))
    (log "leaving event loop")))

; -- init/deinit ------------------------------------------------------------------------------------------------------------

(defn go-init! []
  {:pre [(not *initialized*)]}
  (log "init!")
  (go
    (let [options (<! (go-read-options))
          chrome-event-channel (make-chrome-event-channel (go-channel))]
      (set! *initialized* true)
      (reset-cached-options-without-sync! options)
      (add-watch cached-options ::watch (fn [_ _ _ new-state]
                                          (on-cached-options-change! new-state)))
      (storage/tap-on-changed-events chrome-event-channel)
      (go-run-chrome-event-loop! chrome-event-channel)
      chrome-event-channel)))

(defn deinit! [chrome-event-channel]
  {:pre [*initialized*]}
  (log "deinit!")
  (remove-watch cached-options ::watch)
  (close! chrome-event-channel)
  (set! *initialized* false))
