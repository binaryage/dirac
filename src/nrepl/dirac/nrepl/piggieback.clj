; nREPL middleware enabling the transparent use of a ClojureScript REPL with nREPL tooling.
; taken from https://github.com/cemerick/piggieback/tree/440b2d03f944f6418844c2fab1e0361387eed543
; original author: Chas Emerick
; Eclipse Public License - v 1.0
;
; this file differs from original piggieback.clj and was modified to include Dirac-specific functionality
; removed generic code for supporting arbitrary repl environment, supports only Dirac's WeaselREPLEnv

(ns dirac.nrepl.piggieback
  (:require [clojure.tools.nrepl :as nrepl]
            (clojure.tools.nrepl [transport :as transport]
                                 [misc :refer (response-for returning)]
                                 [middleware :refer (set-descriptor!)])
            [clojure.tools.nrepl.middleware.interruptible-eval :as ieval]
            cljs.repl
            [cljs.env :as env]
            [cljs.analyzer :as ana]
            [clojure.tools.logging :as log])
  (:import clojure.lang.LineNumberingPushbackReader
           java.io.StringReader
           java.io.Writer)
  (:refer-clojure :exclude (load-file)))

; this is the var that is checked by the middleware to determine whether an active CLJS REPL is in flight
(def ^:private ^:dynamic *cljs-repl-env* nil)
(def ^:private ^:dynamic *cljs-compiler-env* nil)
(def ^:private ^:dynamic *cljs-repl-options* nil)
(def ^:private ^:dynamic *original-clj-ns* nil)

(defn wrap-fn [form]
  (let [current-repl-msg ieval/*msg*
        dirac-mode (:dirac current-repl-msg)
        job-id (or (:id current-repl-msg) 0)
        dirac-wrap (case dirac-mode
                     "wrap" (fn [x]
                              `(try
                                 (js/devtools.dirac.present_repl_result ~job-id ~x)
                                 (catch :default e#
                                   (js/devtools.dirac.present_repl_exception ~job-id e#)
                                   (throw e#))))
                     identity)]
    (cond
      (and (seq? form) (= 'ns (first form))) identity
      ('#{*1 *2 *3 *e} form) (fn [x] `(binding [cljs.core/*print-level* 1
                                                cljs.core/*print-length* 10]
                                        (cljs.core.pr-str ~(dirac-wrap x))))
      :else
      (fn [x]
        `(try
           (binding [cljs.core/*print-newline* false
                     cljs.core/*print-fn* (partial js/devtools.dirac.present-output ~job-id "stdout")
                     cljs.core/*print-err-fn* (partial js/devtools.dirac.present-output ~job-id "stderr")]
             (let [ret# ~(dirac-wrap x)]
               (set! *3 *2)
               (set! *2 *1)
               (set! *1 ret#)
               (binding [cljs.core/*print-level* 1
                         cljs.core/*print-length* 10]
                 (cljs.core.pr-str ret#))))
           (catch :default e#
             (set! *e e#)
             (throw e#)))))))

(defn eval-cljs
  "Given a REPL evaluation environment, an analysis environment, and a
   form, evaluate the form and return the result. The result is always the value
   represented as a string."
  ([repl-env env form]
   (eval-cljs repl-env env form cljs.repl/*repl-opts*))
  ([repl-env env form opts]
   (cljs.repl/evaluate-form repl-env
                            (assoc env :ns (ana/get-namespace ana/*cljs-ns*))
                            "<dirac repl>"
                            form
                            ;; the pluggability of :wrap is needed for older JS runtimes like Rhino
                            ;; where catching the error will swallow the original trace
                            ((or (:wrap opts) wrap-fn) form)
                            opts)))

(defn- run-cljs-repl [{:keys [session transport ns] :as nrepl-msg}
                      code repl-env compiler-env options]
  (let [initns (if ns (symbol ns) (@session #'ana/*cljs-ns*))
        repl cljs.repl/repl*
        flush (fn []
                (.flush ^Writer (@session #'*out*))
                (.flush ^Writer (@session #'*err*)))]
    ; MAJOR TRICK HERE! we append :cljs/quit to our code which needs to be evaluated,
    ; this will cause cljs.repl's loop to exit after the first eval
    (binding [*in* (-> (str code " :cljs/quit") StringReader. LineNumberingPushbackReader.)
              *out* (@session #'*out*)
              *err* (@session #'*err*)
              ana/*cljs-ns* initns]
      (repl repl-env
            (merge
              {:need-prompt  (constantly false)
               :bind-err     false
               :quit-prompt  (fn [])
               :init         (fn [])
               :prompt       (fn [])
               :eval         eval-cljs
               :compiler-env compiler-env
               :flush        flush
               :print        (fn [result & rest]
                               ; make sure that all *printed* output is flushed before sending results of evaluation
                               (flush)
                               (when (or (not ns)
                                         (not= initns ana/*cljs-ns*))
                                 (swap! session assoc #'ana/*cljs-ns* ana/*cljs-ns*))
                               (if (::first-cljs-repl nrepl-msg)
                                 ; the first run through the cljs REPL is effectively part
                                 ; of setup; loading core, (ns cljs.user ...), etc, should
                                 ; not yield a value. But, we do capture the compiler
                                 ; environment now (instead of attempting to create one to
                                 ; begin with, because we can't reliably replicate what
                                 ; cljs.repl/repl* does in terms of options munging
                                 (set! *cljs-compiler-env* env/*compiler*)
                                 ; if the CLJS evaluated result is nil, then we can assume
                                 ; what was evaluated was a cljs.repl special fn (e.g. in-ns,
                                 ; require, etc)
                                 (transport/send transport (response-for nrepl-msg
                                                                         {:value         (or result "nil")
                                                                          :printed-value 1
                                                                          :ns            (@session #'ana/*cljs-ns*)}))))
               :caught       (fn [err repl-env repl-options]
                               (let [root-ex (#'clojure.main/root-cause err)]
                                 (when-not (instance? ThreadDeath root-ex)
                                   (transport/send transport (response-for nrepl-msg {:status  :eval-error
                                                                                      :ex      (-> err class str)
                                                                                      :root-ex (-> root-ex class str)}))
                                   (cljs.repl/repl-caught err repl-env repl-options))))}
              options)))))

; This function always executes when the nREPL session is evaluating Clojure,
; via interruptible-eval, etc. This means our dynamic environment is in place,
; so set! and simple dereferencing is available. Contrast w/ evaluate and
; load-file below.
(defn cljs-repl
  "Starts a ClojureScript REPL over top an nREPL session.  Accepts
   all options usually accepted by e.g. cljs.repl/repl."
  [repl-env & {:as options}]
  ; TODO I think we need a var to set! the compiler environment from the REPL
  ; environment after each eval
  (try
    (set! ana/*cljs-ns* 'cljs.user)
    ; this will implicitly set! *cljs-compiler-env*
    (run-cljs-repl (assoc ieval/*msg* ::first-cljs-repl true)
                   (nrepl/code (ns cljs.user
                                 (:require [cljs.repl :refer-macros (source doc find-doc
                                                                            apropos dir pst)])))
                   repl-env nil options)
    ; (clojure.pprint/pprint (:options @*cljs-compiler-env*))
    (set! *cljs-repl-env* repl-env)
    (set! *cljs-repl-options* options)
    ; interruptible-eval is in charge of emitting the final :ns response in this context
    (set! *original-clj-ns* *ns*)
    (set! *ns* (find-ns ana/*cljs-ns*))
    (catch Exception e
      (set! *cljs-repl-env* nil)
      (throw e))))

;; mostly a copy/paste from interruptible-eval
(defn- enqueue [{:keys [session transport] :as msg} func]
  (ieval/queue-eval session @ieval/default-executor
                    (fn []
                      (alter-meta! session assoc
                                   :thread (Thread/currentThread)
                                   :eval-msg msg)
                      (binding [ieval/*msg* msg]
                        (func)
                        (transport/send transport (response-for msg :status :done))
                        (alter-meta! session dissoc :thread :eval-msg)))))

; only executed within the context of an nREPL session having *cljs-repl-env*
; bound. Thus, we're not going through interruptible-eval, and the user's
; Clojure session (dynamic environment) is not in place, so we need to go
; through the `session` atom to access/update its vars. Same goes for load-file.
(defn- evaluate [{:keys [session transport ^String code dirac] :as msg}]
  ; we append a :cljs/quit to every chunk of code evaluated so we can break out of cljs.repl/repl*'s loop,
  ; so we need to go a gnarly little stringy check here to catch any actual user-supplied exit
  (if-not (.. code trim (endsWith ":cljs/quit"))
    (apply run-cljs-repl msg code (map @session [#'*cljs-repl-env* #'*cljs-compiler-env* #'*cljs-repl-options*]))
    (let [actual-repl-env (.-repl-env (@session #'*cljs-repl-env*))]
      (cljs.repl/-tear-down actual-repl-env)
      (swap! session assoc
             #'*ns* (@session #'*original-clj-ns*)
             #'*cljs-repl-env* nil
             #'*cljs-compiler-env* nil
             #'*cljs-repl-options* nil
             #'ana/*cljs-ns* 'cljs.user)
      (transport/send transport (response-for msg
                                              :value "nil"
                                              :printed-value 1
                                              :ns (str (@session #'*original-clj-ns*)))))))

; struggled for too long trying to interface directly with cljs.repl/load-file,
; so just mocking a "regular" load-file call
; this seems to work perfectly, *but* it only loads the content of the file from
; disk, not the content of the file sent in the message (in contrast to nREPL on
; Clojure). This is necessitated by the expectation of cljs.repl/load-file that
; the file being loaded is on disk, in the location implied by the namespace
; declaration.
; TODO either pull in our own `load-file` that doesn't imply this, or raise the issue upstream.
(defn- load-file [{:keys [session transport file-path] :as msg}]
  (evaluate (assoc msg :code (format "(load-file %s)" (pr-str file-path)))))

(defn wrap-cljs-repl [handler]
  (fn [{:keys [session op] :as msg}]
    (let [handler (or (when-let [f (and (@session #'*cljs-repl-env*)
                                        ({"eval" #'evaluate "load-file" #'load-file} op))]
                        (fn [msg] (enqueue msg #(f msg))))
                      handler)]
      ; ensure that bindings exist so cljs-repl can set!
      (when-not (contains? @session #'*cljs-repl-env*)
        (swap! session (partial merge {#'*cljs-repl-env*     *cljs-repl-env*
                                       #'*cljs-compiler-env* *cljs-compiler-env*
                                       #'*cljs-repl-options* *cljs-repl-options*
                                       #'*original-clj-ns*   *original-clj-ns*
                                       #'ana/*cljs-ns*       ana/*cljs-ns*})))
      (handler msg))))

(defn send-bootstrap-info! [server-url]
  (log/trace "send-bootstrap-info!" server-url)
  (let [nrepl-msg ieval/*msg*
        _ (assert nrepl-msg)
        {:keys [transport session]} nrepl-msg
        _ (assert transport)
        _ (assert session)
        info-msg {:op         :bootstrap-info
                  :server-url server-url
                  :ns         (@session #'ana/*cljs-ns*)}]
    (log/trace "sending :bootstrap-info" info-msg)
    (transport/send transport (response-for nrepl-msg info-msg))))