; nREPL middleware enabling the transparent use of a ClojureScript REPL with nREPL tooling.
; taken from https://github.com/cemerick/piggieback/tree/440b2d03f944f6418844c2fab1e0361387eed543
; original author: Chas Emerick
; Eclipse Public License - v 1.0
;
; this file differs significantly from the original piggieback.clj and was modified to include Dirac-specific functionality
;
(ns dirac.nrepl.piggieback
  (:require (clojure.tools.nrepl [transport :as transport]
                                 [misc :refer (response-for returning)]
                                 [middleware :refer (set-descriptor!)])
            [clojure.tools.nrepl.middleware.interruptible-eval :as nrepl-ieval]
            [clojure.main]
            [cljs.repl]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.version :refer [version]]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.jobs :as jobs]
            [dirac.nrepl.debug :as debug]
            [dirac.nrepl.compilers :as compilers]
            [dirac.nrepl.controls :as controls]
            [dirac.nrepl.eval :as eval]
            [dirac.nrepl.messages :as messages]
            [dirac.nrepl.transports.logging :refer [make-nrepl-message-with-logging]]
            [dirac.nrepl.transports.errors-observing :refer [make-nrepl-message-with-observed-errors]]
            [dirac.nrepl.transports.output-capturing :refer [make-nrepl-message-with-captured-output]]
            [dirac.nrepl.transports.job-observing :refer [make-nrepl-message-with-job-observing-transport]]
            [clojure.tools.logging :as log]
            [clojure.string :as string]
            [dirac.logging :as logging]
            [dirac.nrepl.config :as config])
  (:import java.io.Writer)
  (:refer-clojure :exclude (load-file)))

(defn start-new-cljs-compiler-repl-environment! [dirac-nrepl-config repl-env repl-options]
  (log/trace "start-new-cljs-compiler-repl-environment!\n")
  (let [nrepl-message (state/get-nrepl-message)
        compiler-env nil
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
    (eval/execute-single-cljs-repl-evaluation! job-id code ns repl-env compiler-env effective-repl-options response-fn)))

(defn start-cljs-repl! [dirac-nrepl-config repl-env repl-options]
  (log/trace "start-cljs-repl!\n"
             "dirac-nrepl-config:\n"
             (logging/pprint dirac-nrepl-config)
             "repl-env:\n"
             (logging/pprint repl-env)
             "repl-options:\n"
             (logging/pprint repl-options))
  (debug/log-stack-trace!)
  (state/ensure-session nrepl-ieval/*msg*
    (try
      (state/set-session-cljs-ns! 'cljs.user)
      (let [preferred-compiler (or (:preferred-compiler dirac-nrepl-config) "dirac/new")]
        (if (= preferred-compiler "dirac/new")
          (start-new-cljs-compiler-repl-environment! dirac-nrepl-config repl-env repl-options)
          (state/set-session-selected-compiler! preferred-compiler)))                                                         ; TODO: validate that preferred compiler exists
      (state/set-session-cljs-repl-env! repl-env)
      (state/set-session-cljs-repl-options! repl-options)
      (state/set-session-original-clj-ns! *ns*)                                                                               ; interruptible-eval is in charge of emitting the final :ns response in this context
      (set! *ns* (find-ns (state/get-session-cljs-ns)))                                                                       ; TODO: is this really needed? is it for macros?
      (helpers/send-response! (state/get-nrepl-message) (compilers/prepare-announce-ns-msg (state/get-session-cljs-ns)))
      (catch Exception e
        (state/set-session-cljs-repl-env! nil)
        (throw e)))))

;; mostly a copy/paste from interruptible-eval
(defn enqueue! [nrepl-message func]
  (let [{:keys [session]} nrepl-message
        job (fn []
              (alter-meta! session
                           assoc
                           :thread (Thread/currentThread)
                           :eval-msg nrepl-message)
              (binding [nrepl-ieval/*msg* nrepl-message]
                (state/ensure-session nrepl-message
                  (func))
                (helpers/send-response! nrepl-message {:status :done}))
              (alter-meta! session
                           dissoc
                           :thread
                           :eval-msg))]
    (nrepl-ieval/queue-eval session @nrepl-ieval/default-executor job)))

(defn report-missing-compiler! [selected-compiler available-compilers]
  (let [msg (messages/make-missing-compiler-msg selected-compiler available-compilers)]
    (helpers/send-response! (state/get-nrepl-message) (helpers/make-server-side-output-msg :stderr msg))))

; only executed within the context of an nREPL session having *cljs-repl-env*
; bound. Thus, we're not going through interruptible-eval, and the user's
; Clojure session (dynamic environment) is not in place, so we need to go
; through the `session` atom to access/update its vars. Same goes for load-file.
(defn evaluate! [nrepl-message]
  (debug/log-stack-trace!)
  (let [{:keys [session ^String code]} nrepl-message
        cljs-repl-env (state/get-session-cljs-repl-env)]
    ; we append a :cljs/quit to every chunk of code evaluated so we can break out of cljs.repl/repl*'s loop,
    ; so we need to go a gnarly little stringy check here to catch any actual user-supplied exit
    (if-not (.. code trim (endsWith ":cljs/quit"))
      (let [nrepl-message (state/get-nrepl-message)
            job-id (or (:id nrepl-message) (helpers/generate-uuid))
            ns (:ns nrepl-message)
            selected-compiler (state/get-session-selected-compiler)
            cljs-repl-options (state/get-session-cljs-repl-options)
            response-fn (partial helpers/send-response! nrepl-message)]
        (if-let [compiler-env (compilers/get-selected-compiler-env)]
          (eval/execute-single-cljs-repl-evaluation! job-id code ns cljs-repl-env compiler-env cljs-repl-options response-fn)
          (report-missing-compiler! selected-compiler (compilers/collect-all-available-compiler-ids))))
      (do
        (reset! (:cached-setup cljs-repl-env) :tear-down)                                                                     ; TODO: find a better way
        (cljs.repl/-tear-down cljs-repl-env)
        (sessions/remove-dirac-session-descriptor! session)
        (swap! session assoc #'*ns* (state/get-session-original-clj-ns))                                                      ; TODO: is this really needed?
        (let [reply (compilers/prepare-announce-ns-msg (str (state/get-session-original-clj-ns)))]
          (helpers/send-response! nrepl-message reply))))))

; struggled for too long trying to interface directly with cljs.repl/load-file,
; so just mocking a "regular" load-file call
; this seems to work perfectly, *but* it only loads the content of the file from
; disk, not the content of the file sent in the message (in contrast to nREPL on
; Clojure). This is necessitated by the expectation of cljs.repl/load-file that
; the file being loaded is on disk, in the location implied by the namespace
; declaration.
; TODO either pull in our own `load-file` that doesn't imply this, or raise the issue upstream.
(defn load-file! [nrepl-message]
  (let [{:keys [file-path]} nrepl-message]
    (evaluate! (assoc nrepl-message :code (format "(load-file %s)" (pr-str file-path))))))

; -- handlers for middleware operations -------------------------------------------------------------------------------------

(defn dirac-special-command? [nrepl-message]
  (let [code (:code nrepl-message)]
    (if (string? code)
      (some? (re-find #"^\(?dirac!" code)))))                                                                                 ; we don't want to use read-string here, regexp test should be safe and quick

(defn special-repl-eval! [nrepl-message code ns]
  (let [{:keys [session]} nrepl-message]
    (let [result (with-bindings @session
                   (try
                     (let [form (read-string code)]
                       (binding [state/*reply!* #(helpers/send-response! nrepl-message %)
                                 *ns* ns
                                 nrepl-ieval/*msg* nrepl-message]
                         (eval form)))
                     (catch Throwable e
                       (let [root-ex (clojure.main/root-cause e)
                             details (helpers/get-exception-details nrepl-message e)]
                         (log/error (str "Clojure eval error during eval of a special dirac command: " details))
                         ; repl-caught will produce :err message, but we are not under driver, so it won't be converted to :print-output
                         ; that is why we present error output to user REPL manually
                         (clojure.main/repl-caught e)
                         (helpers/send-response! nrepl-message {:op      :print-output
                                                                :kind    :java-trace
                                                                :content (helpers/capture-exception-details e)})
                         (helpers/send-response! nrepl-message {:status  :eval-error
                                                                :ex      (-> e class str)
                                                                :root-ex (-> root-ex class str)
                                                                :details details})
                         ::exception))
                     (finally
                       (.flush ^Writer *out*)
                       (.flush ^Writer *err*))))
          base-reply {:status :done}
          reply (if (= ::controls/no-result ::exception result)
                  base-reply
                  (assoc base-reply
                    :value (helpers/safe-pr-str result)
                    :printed-value 1))]
      (if-not (= ::exception result)
        (helpers/send-response! nrepl-message reply)))))

(defn sanitize-dirac-command [code]
  ; this is just for convenience, we convert some common forms to canonical (dirac! :help) form
  (let [trimmed-code (string/trim code)]
    (if (or (= trimmed-code "dirac!")
            (= trimmed-code "(dirac!)"))
      "(dirac! :help)"
      trimmed-code)))

(defn handle-dirac-special-command! [nrepl-message]
  (let [{:keys [code session]} nrepl-message
        message (if (sessions/dirac-session? session)
                  (make-nrepl-message-with-captured-output nrepl-message)
                  nrepl-message)]
    (special-repl-eval! message (sanitize-dirac-command code) (find-ns 'dirac.nrepl.controls))))                              ; we want to eval special commands in dirac.nrepl.controls namespace

(defn prepare-no-target-session-match-error-message [session]
  (let [info (sessions/get-target-session-info session)]
    (str (messages/make-no-target-session-match-msg info) "\n")))

(defn prepare-no-target-session-match-help-message [session]
  (let [info (sessions/get-target-session-info session)]
    (str (messages/make-no-target-session-help-msg info) "\n")))

(defn report-missing-target-session! [nrepl-message]
  (log/debug "report-missing-target-session!")
  (let [{:keys [session]} nrepl-message]
    (helpers/send-response! nrepl-message {:err (prepare-no-target-session-match-error-message session)})
    (helpers/send-response! nrepl-message {:out (prepare-no-target-session-match-help-message session)})
    (helpers/send-response! nrepl-message {:status :done})))

(defn report-nonforwardable-nrepl-message! [nrepl-message]
  (log/debug "report-nonforwardable-nrepl-message!")
  (let [{:keys [op]} nrepl-message
        clean-message (dissoc nrepl-message :session :transport)
        err (str (messages/make-nrepl-message-cannot-be-forwarded-msg (pr-str clean-message)) "\n")
        out (str (messages/make-no-forwarding-help-msg (or op "?")) "\n")]
    (helpers/send-response! nrepl-message {:err err})
    (helpers/send-response! nrepl-message {:out out})
    (helpers/send-response! nrepl-message {:status :done})))

(defn enqueue-command! [command nrepl-message]
  (enqueue! nrepl-message #(command nrepl-message)))

(defn prepare-forwardable-message [nrepl-message]
  ; based on what is currently supported by intercom on client-side
  ; we deliberately filter keys to a "safe" subset, so the message can be unserialized on client side
  (case (:op nrepl-message)
    "eval" (select-keys nrepl-message [:id :op :code])
    "load-file" (select-keys nrepl-message [:id :op :file :file-path :file-name])
    "interrupt" (select-keys nrepl-message [:id :op :interrupt-id])
    nil))

(defn serialize-message [nrepl-message]
  (pr-str nrepl-message))

(defn forward-message-to-joined-session! [nrepl-message]
  (log/trace "forward-message-to-joined-session!" (logging/pprint nrepl-message))
  (let [{:keys [id session transport]} nrepl-message]
    (if-let [target-dirac-session-descriptor (sessions/find-target-dirac-session-descriptor session)]
      (if-let [forwardable-message (prepare-forwardable-message nrepl-message)]
        (let [target-session (sessions/get-dirac-session-descriptor-session target-dirac-session-descriptor)
              target-transport (sessions/get-dirac-session-descriptor-transport target-dirac-session-descriptor)
              job-id (helpers/generate-uuid)]
          (jobs/register-observed-job! job-id id session transport 1000)
          (transport/send target-transport {:op                                 :handle-forwarded-nrepl-message
                                            :id                                 (helpers/generate-uuid)                       ; our request id
                                            :session                            (sessions/get-session-id target-session)
                                            :job-id                             job-id                                        ; id under which the job should be started
                                            :serialized-forwarded-nrepl-message (serialize-message forwardable-message)}))
        (report-nonforwardable-nrepl-message! nrepl-message))
      (report-missing-target-session! nrepl-message))))

(defn handle-identify-dirac-nrepl-middleware! [_next-handler nrepl-message]
  (helpers/send-response! nrepl-message {:version version}))

(defn handle-eval! [next-handler nrepl-message]
  (let [{:keys [session]} nrepl-message]
    (cond
      (sessions/dirac-session? session) (enqueue-command! evaluate! nrepl-message)
      :else (next-handler (make-nrepl-message-with-observed-errors nrepl-message)))))

(defn handle-load-file! [next-handler nrepl-message]
  (let [{:keys [session]} nrepl-message]
    (if (sessions/dirac-session? session)
      (enqueue-command! load-file! nrepl-message)
      (next-handler (make-nrepl-message-with-observed-errors nrepl-message)))))

(defn wrap-nrepl-message-if-observed-job [nrepl-message]
  (if-let [observed-job (jobs/get-observed-job nrepl-message)]
    (make-nrepl-message-with-job-observing-transport observed-job nrepl-message)
    nrepl-message))

(defn is-eval-cljs-quit-in-joined-session? [nrepl-message]
  (and (= (:op nrepl-message) "eval")
       (= ":cljs/quit" (string/trim (:code nrepl-message)))
       (sessions/joined-session? (:session nrepl-message))))

(defn issue-dirac-special-command! [nrepl-message command]
  (log/debug "issue-dirac-special-command!" command)
  (handle-dirac-special-command! (assoc nrepl-message :code (str "(dirac! " command ")"))))

(defn handle-finish-dirac-job! [nrepl-message]
  (log/debug "handle-finish-dirac-job!")
  (helpers/send-response! nrepl-message (select-keys nrepl-message [:status :err :out])))

; -- nrepl middleware -------------------------------------------------------------------------------------------------------

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
      (sessions/joined-session? session) (forward-message-to-joined-session! nrepl-message)
      :else (handle-known-ops-or-delegate! nrepl-message next-handler))))

(defn dirac-nrepl-middleware-handler [next-handler nrepl-message]
  (state/ensure-session nrepl-message
    (let [nrepl-message (make-nrepl-message-with-logging nrepl-message)]
      (log/debug "dirac-nrepl-middleware:" (:op nrepl-message) (sessions/get-session-id (:session nrepl-message)))
      (log/trace "received nrepl message:\n" (debug/pprint-nrepl-message nrepl-message))
      (debug/log-stack-trace!)
      (cond
        (dirac-special-command? nrepl-message) (handle-dirac-special-command! nrepl-message)
        (is-eval-cljs-quit-in-joined-session? nrepl-message) (issue-dirac-special-command! nrepl-message ":disjoin")
        :else (handle-normal-message! nrepl-message next-handler)))))

(defn dirac-nrepl-middleware [next-handler]
  (partial dirac-nrepl-middleware-handler next-handler))
