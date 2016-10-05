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

(defn start-new-cljs-compiler-repl-environment! [nrepl-message dirac-nrepl-config repl-env repl-options]
  (log/trace "start-new-cljs-compiler-repl-environment!\n")
  (let [compiler-env nil
        code (or (:repl-init-code dirac-nrepl-config) config/standard-repl-init-code)
        job-id (or (:id nrepl-message) (helpers/generate-uuid))
        ns (:ns nrepl-message)
        effective-repl-options (assoc repl-options
                                 ; the first run through the cljs REPL is effectively part
                                 ; of setup; loading core, (ns cljs.user ...), etc, should
                                 ; not yield a value. But, we do capture the compiler
                                 ; environment now (instead of attempting to create one to
                                 ; begin with, because we can't reliably replicate what
                                 ; cljs.repl/repl* does in terms of options munging
                                 :init (fn []
                                         (compilers/capture-current-compiler-and-select-it!))
                                 :print (fn [& _]
                                          (log/trace "print-fn (no-op)")))                                                    ; silence any responses
        response-fn (partial helpers/send-response! nrepl-message)]
    (eval/eval-in-cljs-repl! code ns repl-env compiler-env effective-repl-options job-id)))

(defn start-cljs-repl! [nrepl-message dirac-nrepl-config repl-env repl-options]
  (log/trace "start-cljs-repl!\n"
             "dirac-nrepl-config:\n"
             (logging/pprint dirac-nrepl-config)
             "repl-env:\n"
             (logging/pprint repl-env)
             "repl-options:\n"
             (logging/pprint repl-options))
  (debug/log-stack-trace!)
  (let [initial-session-meta (state/get-session-meta)]
    (try
      (state/set-session-cljs-ns! 'cljs.user)
      (let [preferred-compiler (or (:preferred-compiler dirac-nrepl-config) "dirac/new")]
        (if (= preferred-compiler "dirac/new")
          (start-new-cljs-compiler-repl-environment! nrepl-message dirac-nrepl-config repl-env repl-options)
          (state/set-session-selected-compiler! preferred-compiler)))                                                         ; TODO: validate that preferred compiler exists
      (state/set-session-dirac-nrepl-config! dirac-nrepl-config)
      (state/set-session-cljs-repl-env! repl-env)
      (state/set-session-cljs-repl-options! repl-options)
      (state/set-session-original-clj-ns! *ns*)                                                                               ; interruptible-eval is in charge of emitting the final :ns response in this context
      (set! *ns* (find-ns (state/get-session-cljs-ns)))                                                                       ; TODO: is this really needed? is it for macros?
      (helpers/send-response! nrepl-message (utils/prepare-current-env-info-response))
      (catch Exception e
        (state/set-session-meta! initial-session-meta)                                                                        ; restore session to initial state
        (throw e)))))

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

(defn handle-identify-dirac-nrepl-middleware! [_next-handler nrepl-message]
  (helpers/send-response! nrepl-message {:version version}))

(defn handle-eval! [next-handler nrepl-message]
  (let [{:keys [session]} nrepl-message]
    (if (sessions/dirac-session? session)
      (evaluate! nrepl-message)
      (do
        (state/register-in-flight-nrepl-message! session nrepl-message)
        (next-handler (make-nrepl-message-with-observed-errors nrepl-message))))))

(defn handle-load-file! [next-handler nrepl-message]
  (let [{:keys [session]} nrepl-message]
    (if (sessions/dirac-session? session)
      (load-file! nrepl-message)
      (do
        (state/register-in-flight-nrepl-message! session nrepl-message)
        (next-handler (make-nrepl-message-with-observed-errors nrepl-message))))))

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

(defn handle-known-ops-or-delegate! [nrepl-message next-handler]
  (case (:op nrepl-message)
    "identify-dirac-nrepl-middleware" (handle-identify-dirac-nrepl-middleware! next-handler nrepl-message)
    "finish-dirac-job" (handle-finish-dirac-job! nrepl-message)
    "eval" (handle-eval! next-handler nrepl-message)
    "load-file" (handle-load-file! next-handler nrepl-message)
    (next-handler nrepl-message)))

(defn handle-normal-message! [nrepl-message next-handler]
  (let [{:keys [session] :as nrepl-message} (wrap-nrepl-message-if-observed-job nrepl-message)]
    (cond
      (sessions/joined-session? session) (joining/forward-message-to-joined-session! nrepl-message)
      :else (handle-known-ops-or-delegate! nrepl-message next-handler))))

(defn dirac-nrepl-middleware-handler [next-handler nrepl-message]
  (let [session (:session nrepl-message)]
    (state/ensure-session session
      (let [nrepl-message (make-nrepl-message-with-debug-logging nrepl-message)]
        (log/debug "dirac-nrepl-middleware:" (:op nrepl-message) (sessions/get-session-id session))
        (log/trace "received nrepl message:\n" (debug/pprint-nrepl-message nrepl-message))
        (debug/log-stack-trace!)
        (cond
          (special/dirac-special-command? nrepl-message) (special/handle-dirac-special-command! nrepl-message)
          (is-eval-cljs-quit-in-joined-session? nrepl-message) (special/issue-dirac-special-command! nrepl-message ":disjoin")
          :else (handle-normal-message! nrepl-message next-handler))))))

; -- nrepl middleware -------------------------------------------------------------------------------------------------------

(defn dirac-nrepl-middleware [next-handler]
  (partial dirac-nrepl-middleware-handler next-handler))
