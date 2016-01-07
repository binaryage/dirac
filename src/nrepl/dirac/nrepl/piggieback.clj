; nREPL middleware enabling the transparent use of a ClojureScript REPL with nREPL tooling.
; taken from https://github.com/cemerick/piggieback/tree/440b2d03f944f6418844c2fab1e0361387eed543
; original author: Chas Emerick
; Eclipse Public License - v 1.0
;
; this file differs from original piggieback.clj and was modified to include Dirac-specific functionality
; we don't want to modify this file heavily to be able to apply patches from upstream,
; the idea is to insert just few hooks and implement them elsewhere

(ns dirac.nrepl.piggieback
  (:require [dirac.nrepl.piggieback-hacks :as hacks]
            [clojure.tools.nrepl :as nrepl]
            (clojure.tools.nrepl [transport :as transport]
                                 [misc :refer (response-for returning)]
                                 [middleware :refer (set-descriptor!)])
            [clojure.tools.nrepl.middleware.interruptible-eval :as ieval]
            [clojure.java.io :as io]
            cljs.repl
            [cljs.env :as env]
            [cljs.analyzer :as ana]
            [cljs.repl.rhino :as rhino])
  (:import (org.mozilla.javascript Context ScriptableObject)
           clojure.lang.LineNumberingPushbackReader
           java.io.StringReader
           java.io.Writer)
  (:refer-clojure :exclude (load-file)))

; this is the var that is checked by the middleware to determine whether an
; active CLJS REPL is in flight
(def ^:private ^:dynamic *cljs-repl-env* nil)
(def ^:private ^:dynamic *cljs-compiler-env* nil)
(def ^:private ^:dynamic *cljs-repl-options* nil)
(def ^:private ^:dynamic *original-clj-ns* nil)

; ================ Rhino junk =================

(defn- rhino-repl-env?
  [repl-env]
  (instance? cljs.repl.rhino.RhinoEnv repl-env))

(defmacro ^:private squelch-rhino-context-error
  "Catches and silences the exception thrown by (Context/exit)
   when it is called without a corresponding (Context/enter).
   Needed because rhino/repl-env calls Context/enter without
   a corresponding Context/exit; it assumes:

   (a) the context will only ever be used on one thread
   (b) cljs.repl/repl will clean up the context when the
       command-line cljs repl exits"
  [& body]
  `(try
     ~@body
     (catch IllegalStateException e#
       (when-not (-> e# .getMessage (.contains "Context.exit without previous Context.enter"))
         (throw e#)))))

(defmacro ^:private with-rhino-context
  [& body]
  `(try
     (Context/enter)
     ~@body
     (finally
       ; -tear-down for rhino environments always calls Context/exit, so we need
       ; to kill the resulting error to avoid an exception printing on :cljs/quit
       (squelch-rhino-context-error (Context/exit)))))

(defn- map-stdout
  [rhino-env out]
  (ScriptableObject/putProperty
    (:scope rhino-env)
    "out"
    (Context/javaToJS out (:scope rhino-env))))

(defn- setup-rhino-env
  [rhino-env options]
  (with-rhino-context
    (let [ret (cljs.repl/-setup rhino-env options)]
      ; rhino/rhino-setup maps System/out to "out" and therefore the target of
      ; cljs' *print-fn*! :-(
      (map-stdout rhino-env *out*)
      ; rhino/repl-env calls (Context/enter) without a (Context/exit)
      (squelch-rhino-context-error (Context/exit))
      ret)))

; ================ end Rhino junk =============

; delegating REPL environments
; all this to avoid setting up the "real" REPL environment every time we enter
; cljs.repl/repl*, and to squelch -tear-down entiretly

; we need a delegating REPL environment type for each concrete REPL environment
; type we see, so that the various `satisfies?` calls that `cljs.repl` makes on
; our delegating type are true to what is actually supported; in effect, this is
; all a single-purpose implementation of ClojureScript's `specify`, just to be
; able to override the implementations of -setup and -tear-down supplied for
; each type of REPL environment
(def ^:private cljs-repl-protocol-impls
  {cljs.repl/IReplEnvOptions
   {:-repl-options (fn [repl-env] (cljs.repl/-repl-options (.-repl-env repl-env)))}
   cljs.repl/IParseError
   {:-parse-error (fn [repl-env err build-options]
                    (cljs.repl/-parse-error (.-repl-env repl-env) err build-options))}
   cljs.repl/IGetError
   {:-get-error (fn [repl-env name env build-options]
                  (cljs.repl/-get-error (.-repl-env repl-env) name env build-options))}
   cljs.repl/IParseStacktrace
   {:-parse-stacktrace (fn [repl-env stacktrace err build-options]
                         (cljs.repl/-parse-stacktrace (.-repl-env repl-env) stacktrace err build-options))}
   cljs.repl/IPrintStacktrace
   {:-print-stacktrace (fn [repl-env stacktrace err build-options]
                         (cljs.repl/-print-stacktrace (.-repl-env repl-env) stacktrace err build-options))}})

; type -> ctor-fn
(def ^:private repl-env-ctors (atom {}))

(defn- generate-delegating-repl-env [repl-env]
  (let [repl-env-class (class repl-env)
        classname (.replace (.getName repl-env-class) \. \_)
        dclassname (str "Delegating" classname)]
    (eval
      (list* 'deftype (symbol dclassname)
             '([repl-env ^:volatile-mutable setup-return-val]
                cljs.repl/IJavaScriptEnv
                (-setup [this options]
                        (when (nil? setup-return-val)
                          (set! setup-return-val (atom (if (#'dirac.nrepl.piggieback/rhino-repl-env? repl-env)
                                                         (#'dirac.nrepl.piggieback/setup-rhino-env repl-env options)
                                                         (cljs.repl/-setup repl-env options)))))
                        @setup-return-val)
                (-evaluate [this a b c] (cljs.repl/-evaluate repl-env a b c))
                (-load [this ns url] (cljs.repl/-load repl-env ns url))
                (-tear-down [_])
                clojure.lang.ILookup
                (valAt [_ k] (get repl-env k))
                (valAt [_ k default] (get repl-env k default))
                clojure.lang.Seqable
                (seq [_] (seq repl-env))
                clojure.lang.Associative
                (containsKey [_ k] (contains? repl-env k))
                (entryAt [_ k] (find repl-env k))
                (assoc [_ k v] (#'dirac.nrepl.piggieback/delegating-repl-env (assoc repl-env k v) setup-return-val))
                clojure.lang.IPersistentCollection
                (count [_] (count repl-env))
                (cons [_ entry] (conj repl-env entry))
                ; pretty meaningless; most REPL envs are records for the assoc'ing, but they're not values
                (equiv [_ other] false))))
    (let [dclass (resolve (symbol dclassname))
          ctor (resolve (symbol (str "->" dclassname)))]
      (doseq [[protocol fn-map] cljs-repl-protocol-impls]
        (when (satisfies? protocol repl-env)
          (extend dclass protocol fn-map)))
      @ctor)))

(defn- delegating-repl-env [repl-env setup-return-val]
  (if-let [ctor (@repl-env-ctors (class repl-env))]
    (ctor repl-env nil)
    (let [ctor (generate-delegating-repl-env repl-env)]
      (swap! repl-env-ctors assoc (class repl-env) ctor)
      (ctor repl-env nil))))

;; actually running the REPLs

(defn- run-cljs-repl [{:keys [session transport ns] :as nrepl-msg}
                      code repl-env compiler-env options]
  (let [initns (if ns (symbol ns) (@session #'ana/*cljs-ns*))
        repl (if (rhino-repl-env? (.-repl-env repl-env))
               #(with-rhino-context (apply cljs.repl/repl* %&))
               cljs.repl/repl*)
        flush (fn []
                (.flush ^Writer (@session #'*out*))
                (.flush ^Writer (@session #'*err*)))]
    ;; do we care about line numbers in the REPL?
    (binding [*in* (-> (str code " :cljs/quit") StringReader. LineNumberingPushbackReader.)
              *out* (@session #'*out*)
              *err* (@session #'*err*)
              ana/*cljs-ns* initns]
      (repl repl-env
            (merge
              {:need-prompt (constantly false)
               :init (fn [])
               :prompt (fn [])
               :bind-err false
               :quit-prompt (fn [])
               :compiler-env compiler-env
               :flush flush
               :print (fn [result & rest]
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
                                                                  {:value (or result "nil")
                                                                   :printed-value 1
                                                                   :ns (@session #'ana/*cljs-ns*)}))))
               :caught (fn [err repl-env repl-options]
                         (let [root-ex (#'clojure.main/root-cause err)]
                           (when-not (instance? ThreadDeath root-ex)
                             (transport/send transport (response-for nrepl-msg {:status :eval-error
                                                                                :ex (-> err class str)
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
    (let [repl-env (delegating-repl-env repl-env nil)]
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
      #_(println "To quit, type:" :cljs/quit))
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
    (let [code (if dirac (hacks/wrap-code-for-dirac code) code)]
      (apply run-cljs-repl msg code (map @session [#'*cljs-repl-env* #'*cljs-compiler-env* #'*cljs-repl-options*])))
    (let [actual-repl-env (.-repl-env (@session #'*cljs-repl-env*))]
      (if (rhino-repl-env? actual-repl-env)
        (with-rhino-context (cljs.repl/-tear-down actual-repl-env))
        (cljs.repl/-tear-down actual-repl-env))
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
        (swap! session (partial merge {#'*cljs-repl-env* *cljs-repl-env*
                                       #'*cljs-compiler-env* *cljs-compiler-env*
                                       #'*cljs-repl-options* *cljs-repl-options*
                                       #'*original-clj-ns* *original-clj-ns*
                                       #'ana/*cljs-ns* ana/*cljs-ns*})))
      (handler msg))))

(set-descriptor! #'wrap-cljs-repl
                 {:requires #{"clone"}
                  ; piggieback unconditionally hijacks eval and load-file
                  :expects #{"eval" "load-file"}
                  :handles {}})
