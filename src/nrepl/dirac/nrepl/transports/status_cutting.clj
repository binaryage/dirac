(ns dirac.nrepl.transports.status-cutting
  (:require [clojure.tools.logging :as log]
            [nrepl.transport :as nrepl-transport]
            [dirac.lib.utils :as utils]
            [dirac.nrepl.debug :as debug]
            [dirac.nrepl.protocol :as protocol])
  (:import (nrepl.transport Transport)))

; Some jobs should be ended by sending {:status :done}. But in case of exceptions our code could have already
; sent some other :status, for example see :eval-error sent from driver.
; We would have to keep some global state where we would remember that something already sent :status and no further messages
; should be sent (including :status :done)
;
; This simple transport wrapper observes sent messages and drops any message attempted to be sent after some :status has been
; already sent.

; -- transport wrapper ------------------------------------------------------------------------------------------------------

(defrecord StatusCuttingTransport [nrepl-message state-atom transport]
  Transport
  (recv [_this timeout]
    (nrepl-transport/recv transport timeout))
  (send [_this reply-message]
    (let [message-id (:id reply-message)]
      (if (contains? @state-atom message-id)
        (log/trace "dropping message sent after status:" (utils/pp reply-message))
        (do
          (when (protocol/status-message? reply-message)
            (log/trace "detected status message:" (utils/pp reply-message))
            (swap! state-atom conj message-id))                                                                               ; note that all messages with possibly nil id are treated as one job
          (nrepl-transport/send transport reply-message))))))

; -- public interface -------------------------------------------------------------------------------------------------------

(defn make-nrepl-message-with-status-cutting [nrepl-message]
  (log/trace "make-nrepl-message-with-status-cutting" (debug/pprint-nrepl-message nrepl-message))
  (update nrepl-message :transport (partial ->StatusCuttingTransport nrepl-message (atom #{}))))
