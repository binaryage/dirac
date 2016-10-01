(ns dirac.nrepl.transports.output-capturing
  (:require [clojure.tools.nrepl.transport :as nrepl-transport]
            [dirac.nrepl.helpers :as helpers])
  (:import (clojure.tools.nrepl.transport Transport)))

(defn make-print-output-message [base job-id output-kind content]
  (-> base
      (merge (helpers/make-server-side-output-msg output-kind content))
      (assoc :id job-id)
      (dissoc :out)
      (dissoc :err)))

(defrecord OutputCapturingTransport [nrepl-message transport]
  Transport
  (recv [_this timeout]
    (nrepl-transport/recv transport timeout))
  (send [_this reply-message]
    (if-let [content (:out reply-message)]
      (nrepl-transport/send transport (make-print-output-message reply-message (:id nrepl-message) :stdout content)))
    (if-let [content (:err reply-message)]
      (nrepl-transport/send transport (make-print-output-message reply-message (:id nrepl-message) :stderr content)))
    (nrepl-transport/send transport reply-message)))

(defn make-nrepl-message-with-captured-output [nrepl-message]
  ; repl-eval! does not have our sniffing driver in place, we capture output
  ; by observing :out and :err keys in replied messages
  ; this is good enough because we know that our controls.clj implementation does not do anything crazy and uses
  ; standard *out* and *err* for printing outputs so that normal nREPL output capturing works
  (update nrepl-message :transport (partial ->OutputCapturingTransport nrepl-message)))
