(ns dirac.nrepl.transports.status-cutting
  (:require [clojure.tools.nrepl.transport :as nrepl-transport]
            [clojure.tools.logging :as log]
            [dirac.nrepl.jobs :as jobs]
            [dirac.nrepl.sessions :as sessions]
            [dirac.logging :as logging])
  (:import (clojure.tools.nrepl.transport Transport)))

; Some jobs should be ended by sending {:status :done}. But in case of exceptions our code could have already
; sent some other :status, for example see :eval-error sent from driver.
; We would have to keep some global state where we would remember that something already sent :status and no further messages
; should be sent (including :status :done)
;
; This simple transport wrapper observes sent messages and drops any message attempted to be sent after some :status has been
; already sent.

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn status-message? [message]
  (some? (:status message)))

; -- transport wrapper ------------------------------------------------------------------------------------------------------

(defrecord StatusCuttingTransport [nrepl-message state-atom transport]
  Transport
  (recv [_this timeout]
    (nrepl-transport/recv transport timeout))
  (send [_this reply-message]
    (let [message-id (:id reply-message)]
      (if (contains? @state-atom message-id)
        (log/debug "dropping message sent after status:" (logging/pprint reply-message))
        (do
          (when (status-message? reply-message)
            (log/debug "detected status message:" (logging/pprint reply-message))
            (swap! state-atom conj message-id))                                                                               ; note that all messages with possibly nil id are treated as one job
          (nrepl-transport/send transport reply-message))))))

; -- public interface -------------------------------------------------------------------------------------------------------

(defn make-nrepl-message-with-status-cutting-transport [nrepl-message]
  (log/trace "make-nrepl-message-with-status-cutting-transport" (logging/pprint nrepl-message))
  (update nrepl-message :transport (partial ->StatusCuttingTransport nrepl-message (atom #{}))))
