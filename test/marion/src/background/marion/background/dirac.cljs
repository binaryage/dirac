(ns marion.background.dirac
  (:require [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols.chrome-port :as chrome-port]
            [dirac.settings :refer [get-marion-reconnection-attempt-delay]]
            [dirac.shared.async :refer [<! go go-channel go-wait]]
            [marion.background.feedback :as feedback]
            [marion.background.helpers :as helpers]
            [marion.background.logging :refer [error info log warn]]
            [oops.core :refer [oapply ocall oget]]))

(defonce dirac-extension (atom nil))
(defonce pending-messages (atom []))

; -- pending messages -------------------------------------------------------------------------------------------------------

(defn flush-pending-messages-to-dirac-extension! [dirac-extension]
  (let [messages @pending-messages]
    (when-not (empty? messages)
      (reset! pending-messages [])
      (log "flushing " (count messages) " pending messages:" messages)
      (doseq [message messages]
        (chrome-port/post-message! dirac-extension message)))))

(defn register-pending-message-for-dirac-extension! [message]
  (swap! pending-messages conj message))

; -- registration -----------------------------------------------------------------------------------------------------------

(defn register-dirac-extension! [port]
  {:pre [(not @dirac-extension)]}
  (log "dirac extension connected" port)
  (reset! dirac-extension port)
  (flush-pending-messages-to-dirac-extension! port))

(defn unregister-dirac-extension! []
  (let [port @dirac-extension]
    (assert port)
    (log "dirac extension disconnected" port)
    (reset! dirac-extension nil)))

; -- dirac extension event loop ---------------------------------------------------------------------------------------------

(defn go-post-message-to-dirac-extension! [command]
  (go
    (if-some [port @dirac-extension]
      (chrome-port/post-message! port command)
      (do
        (warn "dirac extension is not connected with marion => queuing..." (pr-str command))
        (register-pending-message-for-dirac-extension! command)))))

; -- message dispatch -------------------------------------------------------------------------------------------------------

(defn go-process-message! [message]
  (let [message-type (oget message "?type")
        message-id (oget message "?id")]
    (log "dispatch dirac extension message" message-id message-type message)
    (case message-type
      "feedback-from-extension" (feedback/go-broadcast-feedback! message)
      "feedback-from-devtools" (feedback/go-broadcast-feedback! message)
      "reply" (feedback/go-broadcast-feedback! message)
      (warn "received unknown dirac extension message type:" message-type message))))

; -- message loop -----------------------------------------------------------------------------------------------------------

(defn go-run-message-loop! [dirac-extension]
  (go
    (register-dirac-extension! dirac-extension)
    (loop []
      (when-some [message (<! dirac-extension)]
        (<! (go-process-message! message))
        (recur)))
    (unregister-dirac-extension!)))

(defn go-maintain-robust-connection-with-dirac-extension! []
  (go
    (loop []
      (log "looking for dirac extension...")
      (when-some [port (<! (helpers/go-connect-to-dirac-extension!))]
        (<! (go-run-message-loop! port)))
      (<! (go-wait (get-marion-reconnection-attempt-delay)))                                                                  ; do not starve this "thread"
      (recur))))
