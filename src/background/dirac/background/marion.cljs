(ns dirac.background.marion
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan put!]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.protocols :refer [post-message! get-sender get-name]]
            [devtools.toolbox :refer [envelope]]
            [dirac.background.state :as state]
            [cljs.reader :as reader]
            [dirac.background.helpers :as helpers]
            [dirac.options.model :as options]))

(defn automate-dirac-frontend! [message]
  (let [{:keys [action]} message
        connection-id (int (:connection-id message))]
    (log "automate-dirac-frontend!" action (envelope message))
    (if (state/get-connection connection-id)
      (helpers/automate-dirac-connection! connection-id action)
      (warn "dirac automation request for missing connection:" connection-id message
            "existing connections:" (state/get-connections)))))

(defn fire-synthetic-chrome-event! [message]
  (if-let [chrome-event-channel (state/get-chrome-event-channel)]
    (put! chrome-event-channel (:chrome-event message))
    (warn "no chrome event channel while receiving marion message" message)))

(defn tear-down! []
  ; we want to close all tabs/windows opened (owned) by our extension
  ; chrome driver does not have access to those windows and fails to switch back to its own tab
  ; https://bugs.chromium.org/p/chromium/issues/detail?id=355075
  (helpers/close-all-extension-tabs!))

; -- marion event loop ------------------------------------------------------------------------------------------------------

(defn register-marion! [marion-port]
  (log "marion connected" (envelope (get-sender marion-port)))
  (if (state/get-marion-port)
    (warn "overwriting previous marion port!"))
  (state/set-marion-port! marion-port))

(defn unregister-marion! []
  (if-let [port (state/get-marion-port)]
    (do
      (log "marion disconnected" (envelope (get-sender port)))
      (state/set-marion-port! nil))
    (warn "unregister-marion! called when no previous marion port!")))

(defn process-marion-message [serialized-message]
  (let [id (oget serialized-message "id")
        payload (oget serialized-message "payload")
        message (reader/read-string payload)
        command (:command message)]
    (log "process-marion-message" command (envelope message))
    (case command
      :set-option (options/set-option! (:key message) (:value message))
      :reset-connection-id-counter (state/reset-connection-id-counter!)
      :fire-synthetic-chrome-event (fire-synthetic-chrome-event! message)
      :automate-dirac-frontend (automate-dirac-frontend! message)
      :tear-down (tear-down!))
    (state/post-reply! id)))

(defn run-marion-message-loop! [marion-port]
  (go-loop []
    (when-let [message (<! marion-port)]
      (process-marion-message message)
      (recur))
    (unregister-marion!)))

; -- marion client connection handling --------------------------------------------------------------------------------------

(defn handle-marion-client-connection! [marion-port]
  (register-marion! marion-port)
  (run-marion-message-loop! marion-port))

(def post-feedback-event! state/post-feedback!)