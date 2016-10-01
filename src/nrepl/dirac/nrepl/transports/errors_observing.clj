(ns dirac.nrepl.transports.errors-observing
  (:require [clojure.tools.nrepl.transport :as nrepl-transport]
            [clojure.tools.logging :as log]
            [dirac.nrepl.helpers :as helpers])
  (:import (clojure.tools.nrepl.transport Transport)
           (clojure.lang IDeref)))

; -- nrepl-message error observer -------------------------------------------------------------------------------------------

(defn get-session-exception [session]
  {:pre [(instance? IDeref session)]}
  (@session #'clojure.core/*e))

(defrecord ErrorsObservingTransport [nrepl-message transport]
  Transport
  (recv [_this timeout]
    (nrepl-transport/recv transport timeout))
  (send [_this reply-message]
    (let [effective-message (if (some #{:eval-error} (:status reply-message))
                              (let [e (get-session-exception (:session nrepl-message))
                                    details (helpers/get-exception-details nrepl-message e)]
                                (log/error (str "Clojure eval error: " details))
                                (assoc reply-message :details details))
                              reply-message)]
      (nrepl-transport/send transport effective-message))))

(defn make-nrepl-message-with-observed-errors [nrepl-message]
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
  (update nrepl-message :transport (partial ->ErrorsObservingTransport nrepl-message)))
