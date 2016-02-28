(ns marion.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [goog.string :as gstring]
            [goog.string.format]
            [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.management :as management]))

(def clients (atom []))                                                                                                       ; ports of content scripts
(def dirac-port (atom nil))

; -- clients manipulation ---------------------------------------------------------------------------------------------------

(defn add-client! [client]
  (log "BACKGROUND: client connected" (get-sender client))
  (swap! clients conj client))

(defn remove-client! [client]
  (log "BACKGROUND: client disconnected" (get-sender client))
  (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
    (swap! clients remove-item client)))

(defn process-client-message [message]
  {:pre [@dirac-port]}
  (log "process-client-message:" message)
  (post-message! @dirac-port message))

; -- client event loop ------------------------------------------------------------------------------------------------------

(defn run-client-message-loop! [client]
  (go-loop []
    (when-let [message (<! client)]
      (process-client-message message)
      (recur))
    (remove-client! client)))

; -- event handlers ---------------------------------------------------------------------------------------------------------

(defn handle-client-connection! [client]
  (add-client! client)
  (run-client-message-loop! client))

; -- main event loop --------------------------------------------------------------------------------------------------------

(defn process-chrome-event [event-num event]
  (log (gstring/format "BACKGROUND: got chrome event (%05d)" event-num) event)
  (let [[event-id event-args] event]
    (case event-id
      ::runtime/on-connect (apply handle-client-connection! event-args)
      nil)))

(defn run-chrome-event-loop! [chrome-event-channel]
  (log "BACKGROUND: starting main event loop...")
  (go-loop [event-num 1]
    (when-let [event (<! chrome-event-channel)]
      (process-chrome-event event-num event)
      (recur (inc event-num)))
    (log "BACKGROUND: leaving main event loop")))

(defn boot-chrome-event-loop! []
  (let [chrome-event-channel (make-chrome-event-channel (chan))]
    (runtime/tap-all-events chrome-event-channel)
    (run-chrome-event-loop! chrome-event-channel)))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn find-extension [pred]
  (go
    (let [[extension-infos] (<! (management/get-all))
          match? (fn [extension-info]
                   (if (pred extension-info) extension-info))]
      (some match? extension-infos))))

(defn find-extension-by-name [name]
  (find-extension (fn [extension-info]
                    (= (oget extension-info "name") name))))

(defn connect-to-dirac-extension! []
  (go
    (if-let [extension-info (<! (find-extension-by-name "Dirac DevTools"))]
      (let [id (oget extension-info "id")]
        (log "found dirac extension id" id)
        (runtime/connect id)))))

(defn init! []
  (log "BACKGROUND: init")
  (go
    (if-let [port (<! (connect-to-dirac-extension!))]
      (do
        (reset! dirac-port port)
        (boot-chrome-event-loop!))
      (error "unable to find dirac extension to instrument"))))