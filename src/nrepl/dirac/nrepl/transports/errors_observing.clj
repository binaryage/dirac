(ns dirac.nrepl.transports.errors-observing
  (:require [clojure.tools.nrepl.transport :as nrepl-transport]
            [clojure.tools.logging :as log]
            [dirac.nrepl.helpers :as helpers])
  (:import (clojure.tools.nrepl.transport Transport)
           (clojure.lang IDeref)))

; This is a little trick due to unfortunate fact that clojure.tools.nrepl.middleware.interruptible-eval/evaluate does not
; offer configurable :caught option. The problem is that eval errors in Clojure REPL are not printed to stderr
; for some reasons and reported exception in response message is not helpful.
;
; Our strategy here is to wrap :transport with our custom implementation which observes send calls and enhances :eval-error
; messages with more details. It relies on the fact that :caught implementation
; in clojure.tools.nrepl.middleware.interruptible-eval/evaluate sets exception into *e binding in the session atom.
;
; Also it uses our logging infrastructure to log the error which should be displayed in console (assuming default log
; levels)

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-session-exception [session]
  {:pre [(instance? IDeref session)]}
  (@session #'clojure.core/*e))

; -- transport wrapper ------------------------------------------------------------------------------------------------------

(defrecord ErrorsObservingTransport [nrepl-message transport]
  Transport
  (recv [_this timeout]
    (nrepl-transport/recv transport timeout))
  (send [_this reply-message]
    (let [enhanced-message (if (and (some #{:eval-error} (helpers/status-coll reply-message))
                                    (nil? (:details reply-message)))
                             (if-let [e (get-session-exception (:session nrepl-message))]
                               (let [details (helpers/get-exception-details nrepl-message e)]
                                 (log/error (str "Clojure eval error:\n" details))
                                 (assoc reply-message :details details))))]
      (nrepl-transport/send transport (or enhanced-message reply-message)))))

; -- public interface -------------------------------------------------------------------------------------------------------

(defn make-nrepl-message-with-observed-errors [nrepl-message]
  (update nrepl-message :transport (partial ->ErrorsObservingTransport nrepl-message)))
