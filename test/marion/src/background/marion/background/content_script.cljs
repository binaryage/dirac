(ns marion.background.content-script
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [marion.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan timeout put!]]
            [devtools.toolbox :refer [envelope]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.protocols :refer [post-message! get-sender]]
            [marion.background.helpers :as helpers]
            [marion.background.feedback :as feedback]
            [marion.background.notifications :as notifications]
            [marion.background.dirac :as dirac]
            [marion.background.clients :as clients]
            [dirac.utils :as utils]))

; -- pending scenarios ------------------------------------------------------------------------------------------------------
; after opening a new tab with scenario URL, we wait for special signal from scenario page that it finished initialization
; and is ready for testing excercise
; in pending-scenarios we keep mappings from opened tab urls which have yet to be marked as "ready"

(defonce pending-scenarios (atom {}))                                                                                         ; scenario-url -> callback

(defn wait-for-scenario-ready! [scenario-url]
  (let [channel (chan)
        handler (fn [message]
                  (swap! pending-scenarios dissoc scenario-url)
                  (put! channel message))]
    (swap! pending-scenarios assoc scenario-url handler)
    channel))

; -- posting replies --------------------------------------------------------------------------------------------------------

(defn serialize-error [e]
  (pr-str (utils/make-error-struct e)))

(defn serialize-reply-data [data]
  (if (instance? js/Error data)
    (serialize-error data)
    (try
      (pr-str (utils/make-result-struct data))
      (catch :default e
        (serialize-error e)))))

(defn post-reply!
  ([message-id] (post-reply! message-id nil))
  ([message-id data]
   (let [message #js {:type "reply"
                      :id   message-id
                      :data (serialize-reply-data data)}]
     (log "broadcasting reply" message-id (envelope message))
     (feedback/broadcast-feedback! message))))

(defn reply-to-message! [message & [data]]
  (post-reply! (oget message "id") data))

; -- message handlers -------------------------------------------------------------------------------------------------------

(defn subscribe-client-to-feedback! [message client]
  (go
    (feedback/subscribe-client! client)
    (reply-to-message! message)))

(defn unsubscribe-client-from-feedback! [message client]
  (go
    (feedback/unsubscribe-client! client)
    (reply-to-message! message)))

(defn subscribe-client-to-notifications! [message client]
  (go
    (notifications/subscribe-client! client)
    (reply-to-message! message)))

(defn unsubscribe-client-from-notifications! [message client]
  (go
    (notifications/unsubscribe-client! client)
    (reply-to-message! message)))

(defn open-tab-with-scenario! [message]
  (let [scenario-url (oget message "url")                                                                                     ; something like http://localhost:9080/scenarios/normal.html
        ready-channel (wait-for-scenario-ready! scenario-url)]
    (go
      (<! (helpers/create-tab-with-url! scenario-url))
      (<! ready-channel)
      (reply-to-message! message))))

(defn scenario-ready! [message client]
  (go
    (let [sender (get-sender client)
          scenario-url (oget sender "url")]
      (if-let [callback (get @pending-scenarios scenario-url)]
        (callback message)
        (warn "expected " scenario-url " to be present in pending-scenarios")))
    (reply-to-message! message)))

(defn switch-to-task-runner! [message]
  (go
    (when-let [tab-id (<! (helpers/find-task-runner-tab-id!))]
      (<! (helpers/activate-tab! tab-id))
      (reply-to-message! message))))

(defn focus-task-runner-window! [message]
  (go
    (when-let [tab-id (<! (helpers/find-task-runner-tab-id!))]
      (<! (helpers/focus-window-with-tab-id! tab-id))
      (reply-to-message! message))))

(defn close-all-tabs! [message]
  (go
    (<! (helpers/close-all-scenario-tabs!))
    (reply-to-message! message)))

(defn handle-extension-command! [message]
  (dirac/post-message-to-dirac-extension! message))

(defn broadcast-feedback-from-scenario! [message]
  (go
    (feedback/broadcast-feedback! (oget message "payload"))
    (reply-to-message! message)))

(defn broadcast-notification! [message]
  (go
    (notifications/broadcast-notification! (oget message "payload"))
    (reply-to-message! message)))

; -- message dispatch -------------------------------------------------------------------------------------------------------

(defn process-message! [client message]
  (let [message-type (oget message "type")
        message-id (oget message "id")]
    (log "dispatch content script message" message-id message-type (envelope message))
    (case message-type
      "marion-subscribe-feedback" (subscribe-client-to-feedback! message client)
      "marion-unsubscribe-feedback" (unsubscribe-client-from-feedback! message client)
      "marion-feedback-from-scenario" (broadcast-feedback-from-scenario! message)
      "marion-subscribe-notifications" (subscribe-client-to-notifications! message client)
      "marion-unsubscribe-notifications" (unsubscribe-client-from-notifications! message client)
      "marion-broadcast-notification" (broadcast-notification! message)
      "marion-open-tab-with-scenario" (open-tab-with-scenario! message)
      "marion-scenario-ready" (scenario-ready! message client)
      "marion-switch-to-task-runner-tab" (switch-to-task-runner! message)
      "marion-focus-task-runner-window" (focus-task-runner-window! message)
      "marion-close-all-tabs" (close-all-tabs! message)
      "marion-extension-command" (handle-extension-command! message))))

; -- content script message loop --------------------------------------------------------------------------------------------

(defn run-message-loop! [client]
  (go-loop []
    (when-let [message (<! client)]
      (<! (process-message! client message))
      (recur))
    (clients/remove-client! client)))

; -- event handlers ---------------------------------------------------------------------------------------------------------

(defn handle-new-connection! [client]
  (clients/add-client! client)
  (run-message-loop! client))