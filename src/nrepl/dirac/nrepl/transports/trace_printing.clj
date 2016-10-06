(ns dirac.nrepl.transports.trace-printing
  (:require [clojure.tools.nrepl.transport :as nrepl-transport]
            [clojure.tools.logging :as log]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.protocol :as protocol]
            [dirac.nrepl.debug :as debug])
  (:import (clojure.tools.nrepl.transport Transport)))

(defn should-output-trace? [nrepl-message]
  (and (some #{:eval-error} (helpers/status-coll nrepl-message))
       (not (:javascript-eval-trouble nrepl-message))))                                                                       ; javascript troubles were already reported as a side-effect when evaluated by weasel

; -- transport wrapper ------------------------------------------------------------------------------------------------------

(defrecord TracePrintingTransport [nrepl-message transport]
  Transport
  (recv [_this timeout]
    (nrepl-transport/recv transport timeout))
  (send [_this reply-message]
    (if (should-output-trace? reply-message)
      (let [details (or (:details reply-message) (str "Exception: " (:ex reply-message) " (no details available)"))
            output-response (protocol/prepare-print-output-response :java-trace details)]
        (nrepl-transport/send transport (protocol/prepare-related-response reply-message output-response))))
    (nrepl-transport/send transport reply-message)))

; -- public interface -------------------------------------------------------------------------------------------------------

(defn make-nrepl-message-with-trace-printing [nrepl-message]
  (log/trace "make-nrepl-message-with-trace-printing" (debug/pprint-nrepl-message nrepl-message))
  (update nrepl-message :transport (partial ->TracePrintingTransport nrepl-message)))
