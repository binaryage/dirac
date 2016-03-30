(ns marion.background.content-script
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [marion.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan timeout]]
            [devtools.toolbox :refer [envelope]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.protocols :refer [post-message! get-sender]]
            [marion.background.helpers :as helpers]
            [marion.background.feedback :as feedback]
            [marion.background.dirac :as dirac]
            [marion.background.clients :as clients]))

; -- message handlers -------------------------------------------------------------------------------------------------------

(defn subscribe-client-to-transcript! [client]
  (feedback/subscribe-client! client))

(defn unsubscribe-client-from-transcript! [client]
  (feedback/unsubscribe-client! client))

(defn open-tab-with-scenario! [message]
  (let [scenario-url (oget message "url")]                                                                                    ; something like http://localhost:9080/scenarios/normal.html
    (helpers/create-tab-with-url! scenario-url)))

(defn switch-to-task-runner! []
  (go
    (if-let [tab-id (<! (helpers/find-task-runner-tab-id!))]
      (helpers/activate-tab! tab-id))))

(defn focus-task-runner-window! []
  (go
    (if-let [tab-id (<! (helpers/find-task-runner-tab-id!))]
      (helpers/focus-window-with-tab-id! tab-id))))

(defn close-all-tabs! []
  (helpers/close-all-scenario-tabs!))

(defn handle-extension-command! [message]
  (dirac/post-message-to-dirac-extension! message))

; -- message dispatch -------------------------------------------------------------------------------------------------------

(defn process-message! [client message]
  (let [message-type (oget message "type")]
    (log "dispatch content script message" message-type (envelope message))
    (case message-type
      "marion-subscribe-transcript" (subscribe-client-to-transcript! client)
      "marion-unsubscribe-transcript" (unsubscribe-client-from-transcript! client)
      "marion-open-tab-with-scenario" (open-tab-with-scenario! message)
      "marion-switch-to-task-runner-tab" (switch-to-task-runner!)
      "marion-focus-task-runner-window" (focus-task-runner-window!)
      "marion-close-all-tabs" (close-all-tabs!)
      "marion-extension-command" (handle-extension-command! (oget message "payload")))))

; -- content script message loop --------------------------------------------------------------------------------------------

(defn run-message-loop! [client]
  (go-loop []
    (when-let [message (<! client)]
      (process-message! client message)
      (recur))
    (clients/remove-client! client)))

; -- event handlers ---------------------------------------------------------------------------------------------------------

(defn handle-new-connection! [client]
  (clients/add-client! client)
  (run-message-loop! client))