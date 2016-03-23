(ns marion.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [goog.string :as gstring]
            [goog.string.format]
            [cljs.core.async :refer [<! chan timeout]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.extension :as extension]
            [chromex.ext.management :as management]
            [chromex.ext.windows :as windows]
            [dirac.sugar :as sugar]))

(defonce clients (atom []))                                                                                                   ; ports of content scripts
(defonce dirac-port (atom nil))
(defonce pending-dirac-messages (atom []))
(defonce transcript-subscribers (atom []))                                                                                    ; ports of content scripts

(defn flush-pending-dirac-messages! [port]
  (let [messages @pending-dirac-messages]
    (when-not (empty? messages)
      (reset! pending-dirac-messages [])
      (log "flushing " (count messages) " pending messages:" messages)
      (doseq [message messages]
        (post-message! port message)))))

(defn register-pending-message! [message]
  (swap! pending-dirac-messages conj message))

(defn register-dirac-port! [new-port]
  (log "register-dirac-port!" new-port)
  (reset! dirac-port new-port)
  (flush-pending-dirac-messages! new-port))

(defn unregister-dirac-port! []
  (log "unregister-dirac-port!")
  (reset! dirac-port nil))

(defn dirac-port-connected? []
  (boolean @dirac-port))

; -- clients manipulation ---------------------------------------------------------------------------------------------------

(defn subscribe-client-to-transcript! [client]
  (log "client subscribed to transcript" client)
  (swap! transcript-subscribers conj client))

(defn unsubscribe-client-from-transcript! [client]
  (log "client unsubscribed to transcript" client)
  (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
    (swap! transcript-subscribers remove-item client)))

(defn is-client-subscribed-to-transcript? [client]
  (boolean (some #{client} @transcript-subscribers)))

(defn add-client! [client]
  (log "BACKGROUND: client connected" (get-sender client))
  (swap! clients conj client))

(defn remove-client! [client]
  (log "BACKGROUND: client disconnected" (get-sender client))
  (if (is-client-subscribed-to-transcript? client)
    (unsubscribe-client-from-transcript! client))
  (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
    (swap! clients remove-item client)))

(defn forward-command-to-dirac-extension! [command]
  (if-let [port @dirac-port]
    (post-message! port command)
    (do
      (register-pending-message! command)
      (warn "dirac extension is not connected with marion => queing"))))

(defn send-feedback-to-subscribed-clients! [message]
  (log "send-transcript-subscribed-clients!" message)
  (doseq [client @transcript-subscribers]
    (post-message! client message)))

(defn create-tab-with-url! [url]
  (go
    (if-let [[tab] (<! (tabs/create #js {:url url}))]
      (sugar/get-tab-id tab))))

(defn open-tab-with-scenario! [message]
  (log "open-dirac-with-scenario!" message)
  (let [scenario-url (oget message "url")]                                                                                    ; something like http://localhost:9080/suite01/resources/scenarios/normal.html
    (create-tab-with-url! scenario-url)))

(defn focus-window-with-tab-id! [tab-id]
  (if-let [window-id (<! (sugar/fetch-tab-window-id tab-id))]
    (windows/update window-id #js {"focused"       true
                                   "drawAttention" true})))

(defn activate-tab! [tab-id]
  (tabs/update tab-id #js {"active" true}))

(defn find-task-runner-tab! []
  (go
    (let [[tabs] (<! (tabs/query #js {:title "TASK RUNNER"}))]
      (if-let [tab (first tabs)]
        tab
        (warn "no TASK RUNNER tab?")))))

(defn find-task-runner-tab-id! []
  (go
    (if-let [tab (<! (find-task-runner-tab!))]
      (sugar/get-tab-id tab))))

(defn switch-to-task-runner! []
  (go
    (if-let [tab-id (<! (find-task-runner-tab-id!))]
      (activate-tab! tab-id))))

(defn focus-task-runner-window! []
  (go
    (if-let [tab-id (<! (find-task-runner-tab-id!))]
      (focus-window-with-tab-id! tab-id))))

(defn close-all-scenario-tabs! []
  (log "close-all-extension-tabs")
  (go
    (let [[tabs] (<! (tabs/query #js {:url "http://*/scenarios/*"}))]
      (doseq [tab tabs]
        (log "remove" tab)
        (tabs/remove (sugar/get-tab-id tab))))))

(defn process-content-script-message [client message]
  (log "process-client-message:" message client)
  (case (oget message "type")
    "marion-subscribe-transcript" (subscribe-client-to-transcript! client)
    "marion-unsubscribe-transcript" (unsubscribe-client-from-transcript! client)
    "marion-open-tab-with-scenario" (open-tab-with-scenario! message)
    "marion-switch-to-task-runner-tab" (switch-to-task-runner!)
    "marion-focus-task-runner-window" (focus-task-runner-window!)
    "marion-close-all-tabs" (close-all-scenario-tabs!)
    "marion-extension-command" (forward-command-to-dirac-extension! (oget message "payload"))))

; -- client event loop ------------------------------------------------------------------------------------------------------

(defn run-content-script-message-loop! [client]
  (go-loop []
    (when-let [message (<! client)]
      (process-content-script-message client message)
      (recur))
    (remove-client! client)))

; -- event handlers ---------------------------------------------------------------------------------------------------------

(defn handle-content-script-connection! [client]
  (add-client! client)
  (run-content-script-message-loop! client))

; -- main event loop --------------------------------------------------------------------------------------------------------

(defn process-chrome-event [event-num event]
  (log (gstring/format "BACKGROUND: got chrome event (%05d)" event-num) event)
  (let [[event-id event-args] event]
    (case event-id
      ::runtime/on-connect (apply handle-content-script-connection! event-args)
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

; -- dirac extension event loop -------------------------------------------------------------------------------------------------------

(defn process-dirac-extension-message! [message]
  (log "process-dirac-extension-message!" message)
  (let [type (oget message "type")]
    (case type
      "feedback-from-dirac-extension" (send-feedback-to-subscribed-clients! message)
      "feedback-from-dirac-frontend" (send-feedback-to-subscribed-clients! message)
      (warn "received unknown dirac message type:" type, message))))

(defn run-dirac-extension-background-page-message-loop! [dirac-port]
  (register-dirac-port! dirac-port)
  (go-loop []
    (if-let [message (<! dirac-port)]
      (do
        (process-dirac-extension-message! message)
        (recur))
      (unregister-dirac-port!))))

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
        (runtime/connect id #js {:name "Dirac Marionettist"})))))

(defn maintain-robust-connection-with-dirac-extension! []
  (go-loop []
    (<! (timeout 1000))                                                                                                       ; marion should connect after dirac extension boots up
    (if-not (dirac-port-connected?)
      (if-let [port (<! (connect-to-dirac-extension!))]
        (run-dirac-extension-background-page-message-loop! port)
        (error "unable to find dirac extension to instrument")))
    (recur)))

(defn init! []
  (log "BACKGROUND: init")
  (boot-chrome-event-loop!)
  (maintain-robust-connection-with-dirac-extension!))