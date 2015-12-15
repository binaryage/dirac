(ns dirac.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [goog.string :as gstring]
            [goog.string.format]
            [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender]]
            [chromex.ext.windows :as windows]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.browser-action :as browser-action]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.extension :as extension]
            [chromex.ext.commands :as commands]
            [dirac.background.cors :refer [setup-cors-rewriting!]]
            [dirac.options.model :refer [get-option]]
            [dirac.target.core :refer [resolve-backend-url]]))

(defn get-devtools-url [backend-url]
  (runtime/get-url (str "devtools/front_end/inspector.html?ws=" backend-url)))

(defn get-first-tab [window-id]
  (go
    (if-let [[tabs] (<! (tabs/query #js {"windowId" window-id}))]
      (first tabs))))

(defn open-devtools [url]
  (windows/create #js {"url" url}))

#_(defn open-devtools [url]
  (go
    (if-let [[window] (<! (windows/create #js {"url" url}))]
      #_(if-let [tab (<! (get-first-tab (oget window "id")))]
          (log "XXX" url (oget tab "id"))
          (tabs/update (oget tab "id") #js {"url" url})))))

(defn open-dirac! [tab]
  (go
    (if-let [tab-url (oget tab "url")]
      (if-let [target-url (get-option :target-url)]
        (if-let [backend-url (<! (resolve-backend-url target-url tab-url))]
          (let [devtools-url (get-devtools-url backend-url)]
            (log "=>" devtools-url)
            (open-devtools devtools-url))
          (warn "Unable to resolve devtools frontend-url" target-url tab-url))
        (warn "No target url"))
      (warn "This tab cannot be debugged: no tab url" tab))))

(defn open-dirac-in-current-tab! []
  (go
    (let [[tabs] (<! (tabs/query #js {"lastFocusedWindow" true
                                      "active"            true}))]
      (if-let [tab (first tabs)]
        (open-dirac! tab)
        (warn "No tab")))))

(defn handle-command! [command]
  (case command
    "open-dirac-devtools" (open-dirac-in-current-tab!)
    (warn "Received unrecognized command:" command)))

; -- main event loop --------------------------------------------------------------------------------------------------------

(defn process-chrome-event [event-num event]
  (log (gstring/format "BACKGROUND: got chrome event (%05d)" event-num) event)
  (let [[event-id event-args] event]
    (case event-id
      ::browser-action/on-clicked (apply open-dirac! event-args)
      ::commands/on-command (apply handle-command! event-args)
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
    (tabs/tap-all-events chrome-event-channel)
    (runtime/tap-all-events chrome-event-channel)
    (browser-action/tap-on-clicked-events chrome-event-channel)
    (commands/tap-on-command-events chrome-event-channel)
    (run-chrome-event-loop! chrome-event-channel)))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "BACKGROUND: init")
  (setup-cors-rewriting!)
  (boot-chrome-event-loop!))
