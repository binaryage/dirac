(ns dirac.nrepl.transports.debug-logging
  (:require [clojure.tools.nrepl.transport :as nrepl-transport]
            [clojure.tools.logging :as log]
            [dirac.logging :as logging]
            [dirac.nrepl.debug :as debug])
  (:import (clojure.tools.nrepl.transport Transport)))

; -- transport wrapper ------------------------------------------------------------------------------------------------------

(defrecord DebugLoggingTransport [nrepl-message transport]
  Transport
  (recv [_this timeout]
    (nrepl-transport/recv transport timeout))
  (send [_this reply-message]
    (log/debug (str "sending raw message via nREPL transport: " transport " \n") (logging/pprint reply-message))
    (debug/log-stack-trace!)
    (nrepl-transport/send transport reply-message)))

; -- public interface -------------------------------------------------------------------------------------------------------

(defn make-nrepl-message-with-debug-logging [nrepl-message]
  (update nrepl-message :transport (partial ->DebugLoggingTransport nrepl-message)))
