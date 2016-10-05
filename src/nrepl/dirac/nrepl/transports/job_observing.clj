(ns dirac.nrepl.transports.job-observing
  (:require [clojure.tools.nrepl.transport :as nrepl-transport]
            [clojure.tools.logging :as log]
            [dirac.logging :as logging]
            [dirac.nrepl.jobs :as jobs]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.protocol :as protocol])
  (:import (clojure.tools.nrepl.transport Transport)))

; Please note that joined session feature is described here:
; https://github.com/binaryage/dirac/blob/master/docs/integration.md
;
; The idea of this transport is to "echo" all sent messages to an observing transport.
; The observing transport is typically Cursive nREPL client which joined a Dirac REPL session.
;

; -- transport wrapper ------------------------------------------------------------------------------------------------------

(defrecord JobObservingTransport [observed-job nrepl-message transport]
  Transport
  (recv [_this timeout]
    (nrepl-transport/recv transport timeout))
  (send [_this reply-message]
    (let [observing-transport (jobs/get-observed-job-transport observed-job)
          observing-session (jobs/get-observed-job-session observed-job)
          initial-message-id (jobs/get-observed-job-message-id observed-job)
          artificial-message (assoc reply-message
                               :id initial-message-id
                               :session (sessions/get-session-id observing-session))]
      (log/debug "sending message to observing session" observing-session (logging/pprint artificial-message))
      (nrepl-transport/send observing-transport artificial-message))
    (if (protocol/status-message? reply-message)
      (jobs/unregister-observed-job! (jobs/get-observed-job-id observed-job)))
    (nrepl-transport/send transport reply-message)))

; -- public interface -------------------------------------------------------------------------------------------------------

(defn make-nrepl-message-with-job-observing-transport [observed-job nrepl-message]
  (log/trace "make-nrepl-message-with-observing-transport" observed-job (logging/pprint nrepl-message))
  (update nrepl-message :transport (partial ->JobObservingTransport observed-job nrepl-message)))
