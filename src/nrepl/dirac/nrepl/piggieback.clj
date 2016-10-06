; nREPL middleware enabling the transparent use of a ClojureScript REPL with nREPL tooling.
; taken from https://github.com/cemerick/piggieback/tree/440b2d03f944f6418844c2fab1e0361387eed543
; original author: Chas Emerick
; Eclipse Public License - v 1.0
;
; this file differs significantly from the original piggieback.clj and was modified to include Dirac-specific functionality
;
(ns dirac.nrepl.piggieback
  (:require [clojure.tools.logging :as log]
            [clojure.string :as string]
            [dirac.logging :as logging]
            [dirac.nrepl.config :as config]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.version :refer [version]]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.jobs :as jobs]
            [dirac.nrepl.debug :as debug]
            [dirac.nrepl.compilers :as compilers]
            [dirac.nrepl.eval :as eval]
            [dirac.nrepl.messages :as messages]
            [dirac.nrepl.special :as special]
            [dirac.nrepl.joining :as joining]
            [dirac.nrepl.protocol :as protocol]
            [dirac.nrepl.utils :as utils]
            [dirac.nrepl.transports.status-cutting :refer [make-nrepl-message-with-status-cutting-transport]]
            [dirac.nrepl.transports.debug-logging :refer [make-nrepl-message-with-debug-logging]]
            [dirac.nrepl.transports.errors-observing :refer [make-nrepl-message-with-observed-errors]]
            [dirac.nrepl.transports.job-observing :refer [make-nrepl-message-with-job-observing-transport]]))

(defn report-missing-compiler! [nrepl-message selected-compiler available-compilers]
  (let [msg (messages/make-missing-compiler-msg selected-compiler available-compilers)]
    (helpers/send-response! nrepl-message (protocol/prepare-print-output-response :stderr msg))))

(defn user-wants-quit? [code]
  (.endsWith (.trim code) ":cljs/quit"))

(defn evaluate!* [nrepl-message]
  (let [{:keys [session code]} nrepl-message
        cljs-repl-env (state/get-session-cljs-repl-env)]
    (if-not (user-wants-quit? code)
      (let [job-id (or (:id nrepl-message) (helpers/generate-uuid))
            ns (:ns nrepl-message)
            mode (:dirac nrepl-message)
            scope-info (:scope-info nrepl-message)
            selected-compiler (state/get-session-selected-compiler)
            cljs-repl-options (state/get-session-cljs-repl-options)
            response-fn (partial helpers/send-response! nrepl-message)]
        (if-let [compiler-env (compilers/get-selected-compiler-env)]
          (eval/eval-in-cljs-repl! code ns cljs-repl-env compiler-env cljs-repl-options job-id response-fn scope-info mode)
          (report-missing-compiler! nrepl-message selected-compiler (compilers/collect-all-available-compiler-ids))))
      (let [original-clj-ns (state/get-session-original-clj-ns)]
        (reset! (:cached-setup cljs-repl-env) :tear-down)                                                                     ; TODO: find a better way
        (cljs.repl/-tear-down cljs-repl-env)
        (sessions/remove-dirac-session-descriptor! session)
        (swap! session assoc #'*ns* original-clj-ns)                                                                          ; TODO: is this really needed?
        (helpers/send-response! nrepl-message {:value         "nil"
                                               :printed-value 1
                                               :ns            (str original-clj-ns)}))))
  (helpers/send-response! nrepl-message {:status :done}))

(defn evaluate! [nrepl-message]
  (debug/log-stack-trace!)
  (let [status-cutting-nrepl-message (make-nrepl-message-with-status-cutting-transport nrepl-message)]
    (evaluate!* status-cutting-nrepl-message)))

(defn load-file! [nrepl-message]
  (let [{:keys [file-path]} nrepl-message]
    (evaluate! (assoc nrepl-message :code (format "(load-file %s)" (pr-str file-path))))))

; -- middleware dispatch logic ----------------------------------------------------------------------------------------------

(defn handle-identify-dirac-nrepl-middleware! [nrepl-message]
  (helpers/send-response! nrepl-message {:version version}))

(defn handle-eval! [nrepl-message]
  (let [{:keys [session]} nrepl-message]
    (assert (sessions/dirac-session? session))
    (evaluate! nrepl-message)))

(defn handle-load-file! [nrepl-message]
  (let [{:keys [session]} nrepl-message]
    (assert (sessions/dirac-session? session))
    (load-file! nrepl-message)))

(defn wrap-nrepl-message-if-observed-job [nrepl-message]
  (if-let [observed-job (jobs/get-observed-job nrepl-message)]
    (make-nrepl-message-with-job-observing-transport observed-job nrepl-message)
    nrepl-message))

(defn is-eval-cljs-quit-in-joined-session? [nrepl-message]
  (and (= (:op nrepl-message) "eval")
       (= ":cljs/quit" (string/trim (:code nrepl-message)))
       (sessions/joined-session? (:session nrepl-message))))

(defn handle-finish-dirac-job! [nrepl-message]
  (log/debug "handle-finish-dirac-job!")
  (helpers/send-response! nrepl-message (select-keys nrepl-message [:status :err :out])))

(def our-ops {"identify-dirac-nrepl-middleware" true
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
        (is-eval-cljs-quit-in-joined-session? nrepl-message)
        (our-op? (:op nrepl-message)))))

(defn handle-op! [nrepl-message]
  (let [op (:op nrepl-message)]
    (assert (our-op? op))
    (case op
      "identify-dirac-nrepl-middleware" (handle-identify-dirac-nrepl-middleware! nrepl-message)
      "finish-dirac-job" (handle-finish-dirac-job! nrepl-message)
      "eval" (handle-eval! nrepl-message)
      "load-file" (handle-load-file! nrepl-message))))

(defn handle-normal-message! [nrepl-message]
  (let [nrepl-message (wrap-nrepl-message-if-observed-job nrepl-message)]
    (cond
      (sessions/joined-session? (:session nrepl-message)) (joining/forward-message-to-joined-session! nrepl-message)
      :else (handle-op! nrepl-message))))

(defn handle-message! [nrepl-message]
  (let [nrepl-message (make-nrepl-message-with-debug-logging nrepl-message)
        session (state/get-current-session)]
    (log/debug "handle-message!" (:op nrepl-message) (sessions/get-session-id session))
    (cond
      (special/dirac-special-command? nrepl-message) (special/handle-dirac-special-command! nrepl-message)
      (is-eval-cljs-quit-in-joined-session? nrepl-message) (special/issue-dirac-special-command! nrepl-message ":disjoin")
      :else (handle-normal-message! nrepl-message))))

(defn handler-job! [next-handler nrepl-message]
  (state/register-last-seen-nrepl-message! nrepl-message)
  (if (our-message? nrepl-message)
    (handle-message! nrepl-message)
    (next-handler nrepl-message)))

(defn dirac-nrepl-middleware-handler [next-handler nrepl-message]
  (log/trace "processing nrepl message:\n" (debug/pprint-nrepl-message nrepl-message))
  (debug/log-stack-trace!)
  (let [session (:session nrepl-message)]
    (state/ensure-session session
      (handler-job! next-handler nrepl-message))))

; -- nrepl middleware -------------------------------------------------------------------------------------------------------

(defn dirac-nrepl-middleware [next-handler]
  (partial dirac-nrepl-middleware-handler next-handler))
