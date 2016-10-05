(ns dirac.nrepl.transports.output-capturing
  (:require [clojure.tools.nrepl.transport :as nrepl-transport]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.protocol :as protocol])
  (:import (clojure.tools.nrepl.transport Transport)))

; repl-eval! does not have our sniffing driver in place, we capture output
; by observing :out and :err keys in replied messages
; this is good enough because we know that our controls.clj implementation does not do anything crazy and uses
; standard *out* and *err* for printing outputs so that normal nREPL output capturing works

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn prepare-complete-print-output-response [base output-kind content]
  (-> base
      (merge (protocol/prepare-print-output-response output-kind content))
      (dissoc :out)
      (dissoc :err)))

; -- transport wrapper ------------------------------------------------------------------------------------------------------

(defrecord OutputCapturingTransport [nrepl-message transport]
  Transport
  (recv [_this timeout]
    (nrepl-transport/recv transport timeout))
  (send [_this reply-message]
    (if-let [content (:out reply-message)]
      (nrepl-transport/send transport (prepare-complete-print-output-response reply-message :stdout content)))
    (if-let [content (:err reply-message)]
      (nrepl-transport/send transport (prepare-complete-print-output-response reply-message :stderr content)))
    (nrepl-transport/send transport reply-message)))

; -- public interface -------------------------------------------------------------------------------------------------------

(defn make-nrepl-message-with-captured-output [nrepl-message]
  (update nrepl-message :transport (partial ->OutputCapturingTransport nrepl-message)))
