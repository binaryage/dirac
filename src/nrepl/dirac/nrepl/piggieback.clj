; nREPL middleware enabling the transparent use of a ClojureScript REPL with nREPL tooling.
; taken from https://github.com/cemerick/piggieback/tree/440b2d03f944f6418844c2fab1e0361387eed543
; original author: Chas Emerick
; Eclipse Public License - v 1.0
;
; the original source was completely rewritten
;
(ns dirac.nrepl.piggieback
  (:require [clojure.tools.logging :as log]
            [dirac.nrepl.debug :as debug]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.joining :as joining]
            [dirac.nrepl.protocol :as protocol]
            [dirac.nrepl.requests :as requests]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.special :as special]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.utils :as utils]
            [dirac.nrepl.version :refer [version]]))

; -- middleware dispatch logic ----------------------------------------------------------------------------------------------

(def our-ops {"identify-dirac-nrepl-middleware" true
              "dirac-devtools-request"          true
              "finish-dirac-job"                true
              "eval"                            #(state/dirac-session?)
              "load-file"                       #(state/dirac-session?)})

(defn our-op? [op]
  (boolean
    (let [pred (get our-ops op)]
      (or (true? pred)
          (and (fn? pred) (pred))))))

(defn our-message? [nrepl-message]
  (boolean
    (or (special/dirac-special-command? nrepl-message)
        (sessions/joined-session? (:session nrepl-message))
        (our-op? (:op nrepl-message)))))

; -- message handling cascade -----------------------------------------------------------------------------------------------

(defn handle-identify-message! [nrepl-message]
  (log/trace "handle-identify-message!")
  (helpers/send-response! nrepl-message (protocol/prepare-version-response version)))

(defn handler-dirac-devtools-request! [nrepl-message]
  (log/trace "handler-dirac-devtools-request!")
  (let [payload (:payload nrepl-message)
        request (:request nrepl-message)
        result (requests/handle-request! request payload)]
    (helpers/send-response! nrepl-message (merge (protocol/prepare-done-response) {:result result}))))

(defn handle-finish-dirac-job-message! [nrepl-message]
  (log/trace "handle-finish-dirac-job!")
  (helpers/send-response! nrepl-message (protocol/extract-bare-status-response nrepl-message)))

(defn handle-eval-message! [nrepl-message]
  (log/trace "handle-eval-message!")
  (assert (sessions/dirac-session? (:session nrepl-message)))
  (utils/evaluate! nrepl-message))

(defn handle-load-file-message! [nrepl-message]
  (log/trace "handle-load-file-message!")
  (assert (sessions/dirac-session? (:session nrepl-message)))
  (utils/load-file! nrepl-message))

(defn handle-nonspecial-nonjoined-message! [nrepl-message]
  (let [op (:op nrepl-message)]
    (assert (our-op? op))
    (case op
      "identify-dirac-nrepl-middleware" (handle-identify-message! nrepl-message)
      "dirac-devtools-request" (handler-dirac-devtools-request! nrepl-message)
      "finish-dirac-job" (handle-finish-dirac-job-message! nrepl-message)
      "eval" (handle-eval-message! nrepl-message)
      "load-file" (handle-load-file-message! nrepl-message))))

(defn handle-nonspecial-message! [nrepl-message]
  (let [nrepl-message (utils/wrap-nrepl-message-if-observed-job nrepl-message)
        joined-session? (sessions/joined-session? (:session nrepl-message))]
    (cond
      joined-session? (joining/forward-message-to-joined-session! nrepl-message)
      :else (handle-nonspecial-nonjoined-message! nrepl-message))))

(defn handle-message! [nrepl-message]
  (let [session (state/get-current-session)]
    (log/debug "handle-message!" (:op nrepl-message) (sessions/get-session-id session))
    (cond
      (special/dirac-special-command? nrepl-message) (special/handle-dirac-special-command! nrepl-message)
      :else (handle-nonspecial-message! nrepl-message))))

(defn handler-job! [next-handler nrepl-message]
  (state/register-last-seen-nrepl-message! nrepl-message)
  (if (our-message? nrepl-message)
    (handle-message! (utils/wrap-nrepl-message nrepl-message))
    (next-handler nrepl-message)))

; -- top entry point (called by nrepl middleware stack) ---------------------------------------------------------------------

(defn dirac-nrepl-middleware-handler [next-handler nrepl-message]
  (log/trace "processing nrepl message:\n" (debug/pprint-nrepl-message nrepl-message))
  (debug/log-stack-trace!)
  (state/ensure-session (:session nrepl-message)
    (handler-job! next-handler nrepl-message)))

; -- nrepl middleware -------------------------------------------------------------------------------------------------------

(defn dirac-nrepl-middleware [next-handler]
  (partial dirac-nrepl-middleware-handler next-handler))
