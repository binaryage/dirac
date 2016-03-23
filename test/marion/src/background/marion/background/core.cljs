(ns marion.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.settings :refer [get-marion-initial-wait-time get-marion-reconnection-attempt-delay]]
                   [marion.background.logging :refer [log info warn error]])
  (:require [goog.string :as gstring]
            [goog.string.format]
            [cljs.core.async :refer [<! chan timeout]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.extension :as extension]
            [chromex.ext.management :as management]
            [chromex.ext.windows :as windows]
            [dirac.sugar :as sugar]))

(defonce clients (atom []))                                                                                                   ; ports of content scripts
(defonce transcript-subscribers (atom []))                                                                                    ; ports of content scripts
(defonce dirac-extension-port (atom nil))
(defonce pending-messages-for-dirac-extension (atom []))

(defn flush-pending-messages-for-dirac-extension! [port]
  (let [messages @pending-messages-for-dirac-extension]
    (when-not (empty? messages)
      (reset! pending-messages-for-dirac-extension [])
      (log "flushing " (count messages) " pending messages:" messages)
      (doseq [message messages]
        (post-message! port message)))))

(defn register-pending-message-for-dirac-extension! [message]
  (swap! pending-messages-for-dirac-extension conj message))

(defn register-dirac-extension! [new-port]
  (reset! dirac-extension-port new-port)
  (flush-pending-messages-for-dirac-extension! new-port))

(defn unregister-dirac-extension! []
  (reset! dirac-extension-port nil))

(defn dirac-extension-connected? []
  (boolean @dirac-extension-port))

(defn post-message-to-dirac-extension! [command]
  (if-let [port @dirac-extension-port]
    (post-message! port command)
    (do
      (register-pending-message-for-dirac-extension! command)
      (warn "dirac extension is not connected with marion => queing"))))

; -- clients manipulation ---------------------------------------------------------------------------------------------------

(defn subscribe-client-to-transcript! [client]
  (log "a client subscribed to transcript feedback" client)
  (swap! transcript-subscribers conj client))

(defn unsubscribe-client-from-transcript! [client]
  (log "a client unsubscribed to transcript feedback" client)
  (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
    (swap! transcript-subscribers remove-item client)))

(defn is-client-subscribed-to-transcript? [client]
  (boolean (some #{client} @transcript-subscribers)))

(defn add-client! [client]
  (let [sender (get-sender client)
        sender-url (oget sender "url")]
    (log (str "a client connected: " sender-url) sender)
    (swap! clients conj client)))

(defn remove-client! [client]
  (let [sender (get-sender client)
        sender-url (oget sender "url")]
    (if (is-client-subscribed-to-transcript? client)
      (unsubscribe-client-from-transcript! client))
    (log (str "a client disconnected: " sender-url) sender)
    (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
      (swap! clients remove-item client))))

(defn send-feedback-to-subscribed-clients! [message]
  (doseq [subscriber @transcript-subscribers]
    (post-message! subscriber message)))

(defn create-tab-with-url! [url]
  (go
    (if-let [[tab] (<! (tabs/create #js {:url url}))]
      (sugar/get-tab-id tab))))

(defn open-tab-with-scenario! [message]
  (let [scenario-url (oget message "url")]                                                                                    ; something like http://localhost:9080/suite01/resources/scenarios/normal.html
    (create-tab-with-url! scenario-url)))

(defn focus-window-with-tab-id! [tab-id]
  (go
    (if-let [window-id (<! (sugar/fetch-tab-window-id tab-id))]
      (windows/update window-id #js {"focused"       true
                                     "drawAttention" true}))))

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
  (let [message-type (oget message "type")]
    (log "process-content-script-message:" message-type message)
    (case message-type
      "marion-subscribe-transcript" (subscribe-client-to-transcript! client)
      "marion-unsubscribe-transcript" (unsubscribe-client-from-transcript! client)
      "marion-open-tab-with-scenario" (open-tab-with-scenario! message)
      "marion-switch-to-task-runner-tab" (switch-to-task-runner!)
      "marion-focus-task-runner-window" (focus-task-runner-window!)
      "marion-close-all-tabs" (close-all-scenario-tabs!)
      "marion-extension-command" (post-message-to-dirac-extension! (oget message "payload")))))

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
  (log (gstring/format "got chrome event (%05d)" event-num) event)
  (let [[event-id event-args] event]
    (case event-id
      ::runtime/on-connect (apply handle-content-script-connection! event-args)
      nil)))

(defn run-chrome-event-loop! [chrome-event-channel]
  (log "starting main event loop...")
  (go-loop [event-num 1]
    (when-let [event (<! chrome-event-channel)]
      (process-chrome-event event-num event)
      (recur (inc event-num)))
    (log "leaving main event loop")))

(defn boot-chrome-event-loop! []
  (let [chrome-event-channel (make-chrome-event-channel (chan))]
    (runtime/tap-all-events chrome-event-channel)
    (run-chrome-event-loop! chrome-event-channel)))

; -- dirac extension event loop ---------------------------------------------------------------------------------------------

(defn process-dirac-extension-message! [message]
  (let [message-type (oget message "type")]
    (log "process-dirac-extension-message!" message-type message)
    (case message-type
      "feedback-from-dirac-extension" (send-feedback-to-subscribed-clients! message)
      "feedback-from-dirac-frontend" (send-feedback-to-subscribed-clients! message)
      (warn "received unknown dirac extension message type:" message-type message))))

(defn run-dirac-extension-background-page-message-loop! [dirac-port]
  (register-dirac-extension! dirac-port)
  (go-loop []
    (if-let [message (<! dirac-port)]
      (do
        (process-dirac-extension-message! message)
        (recur))
      (unregister-dirac-extension!))))

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
      (let [extension-id (oget extension-info "id")]
        (log (str "found dirac extension id: '" extension-id "'"))
        (runtime/connect extension-id #js {:name "Dirac Marionettist"})))))

(defn maintain-robust-connection-with-dirac-extension! []
  (go-loop []
    (if-not (dirac-extension-connected?)
      (if-let [port (<! (connect-to-dirac-extension!))]
        (run-dirac-extension-background-page-message-loop! port)
        (error "unable to find a dirac extension to instrument")))
    (<! (timeout (get-marion-reconnection-attempt-delay)))                                                                    ; do not starve this thread
    (recur)))

(defn init! []
  (log "init!")
  (boot-chrome-event-loop!)
  (go
    (<! (timeout (get-marion-initial-wait-time)))                                                                             ; marion should connect after dirac extension boots up
    (maintain-robust-connection-with-dirac-extension!)))