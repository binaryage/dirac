(ns dirac.nrepl.eval
  (:require [cljs.repl]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.driver :as driver]
            [dirac.nrepl.version :refer [version]]
            [dirac.nrepl.compilers :as compilers]
            [clojure.tools.logging :as log]
            [cljs.analyzer :as analyzer]
            [dirac.logging :as logging])
  (:import clojure.lang.LineNumberingPushbackReader
           java.io.StringReader))

(defn ^:dynamic make-dirac-repl-alias [compiler-id]
  (str "<" (or compiler-id "?") ">"))

; -- dirac-specific wrapper for evaluated forms -----------------------------------------------------------------------------

(defn safe-value-conversion-to-string [value]
  ; darwin: I have a feeling that these cljs.core bindings should not be hard-coded.
  ;         I understand that printing must be limited somehow. But this should be user-configurable.
  ;         Dirac REPL does not use returned string value - but normal nREPL clients are affected by this.
  `(binding [cljs.core/*print-level* 1
             cljs.core/*print-length* 10]
     (cljs.core/pr-str ~value)))

(defn make-wrap-for-job [job-id]
  (fn [form]
    `(try
       (js/dirac.runtime.repl.present_repl_result ~job-id ~form)
       (catch :default e#
         (js/dirac.runtime.repl.present_repl_exception ~job-id e#)
         (throw e#)))))

(defn make-job-evaluator [dirac-wrap job-id]
  (fn [form]
    (let [result-sym (gensym "result")]
      `(try
         ; we want to redirect all side-effect printing to dirac.runtime, so it can be presented in the Dirac REPL console
         (binding [cljs.core/*print-newline* false
                   cljs.core/*print-fn* (partial js/dirac.runtime.repl.present_output ~job-id "stdout")
                   cljs.core/*print-err-fn* (partial js/dirac.runtime.repl.present_output ~job-id "stderr")]
           (let [~result-sym ~(dirac-wrap form)]
             (set! *3 *2)
             (set! *2 *1)
             (set! *1 ~result-sym)
             ~(safe-value-conversion-to-string result-sym)))
         (catch :default e#
           (set! *e e#)
           (throw e#))))))

(defn make-special-form-evaluator [dirac-wrap]
  (fn [form]
    (safe-value-conversion-to-string (dirac-wrap form))))

(defn make-wrapper-for-form [job-id dirac-mode form]
  (if (and (seq? form) (= 'ns (first form)))
    identity
    (let [dirac-wrap (case dirac-mode
                       "wrap" (make-wrap-for-job job-id)
                       identity)]
      (if ('#{*1 *2 *3 *e} form)
        (make-special-form-evaluator dirac-wrap)
        (make-job-evaluator dirac-wrap job-id)))))

(defn set-env-namespace [env]
  (assoc env :ns (analyzer/get-namespace analyzer/*cljs-ns*)))

(defn extract-scope-locals [scope-info]
  (mapcat :props (:frames scope-info)))

; extract locals from scope-info (as provided by Dirac) and put it into :locals env map for analyzer
; note that in case of duplicit names we won't break, resulting locals is a flat list: "last name wins"
(defn set-env-locals [scope-info env]
  (let [all-scope-locals (extract-scope-locals scope-info)
        build-env-local (fn [local]
                          (let [{:keys [name identifier]} local
                                name-sym (symbol name)
                                identifier-sym (if identifier (symbol identifier) name-sym)]
                            [name-sym {:name identifier-sym}]))
        env-locals (into {} (map build-env-local all-scope-locals))]
    (assoc env :locals env-locals)))

(defn repl-eval! [job-id scope-info dirac-mode repl-env env form opts]
  (let [wrapper-fn (or (:wrap opts) (partial make-wrapper-for-form job-id dirac-mode))
        wrapped-form (wrapper-fn form)
        set-env-locals-with-scope (partial set-env-locals scope-info)
        effective-env (-> env set-env-namespace set-env-locals-with-scope)
        filename (make-dirac-repl-alias (compilers/get-selected-compiler-id))]
    (log/trace "repl-eval! in " filename ":\n" form "\n with env:\n" (logging/pprint effective-env 7))
    (cljs.repl/evaluate-form repl-env effective-env filename form wrapped-form opts)))

(defn repl-flush! []
  (log/trace "flush-repl!")
  (.flush *out*)
  (.flush *err*))

(defn repl-print! [response-fn result]
  (log/trace "repl-print!" result)
  (response-fn (compilers/prepare-announce-ns-msg analyzer/*cljs-ns* result)))

; -- public api -------------------------------------------------------------------------------------------------------------

(defn eval-in-cljs-repl! [code ns repl-env compiler-env repl-options response-fn job-id & [scope-info dirac-mode]]
  {:pre [(some? job-id)]}
  (let [default-repl-options {:need-prompt  (constantly false)
                              :bind-err     false
                              :quit-prompt  (fn [])
                              :prompt       (fn [])
                              :init         (fn [])
                              :flush        repl-flush!
                              :print        (partial repl-print! response-fn)
                              :eval         (partial repl-eval! job-id scope-info dirac-mode)
                              :compiler-env compiler-env}
        effective-repl-options (merge default-repl-options repl-options)
        ; MAJOR TRICK HERE!
        ; we append :cljs/quit to our code which should be evaluated
        ; this will cause cljs.repl loop to exit after the first eval
        code-reader-with-quit (-> (str code " :cljs/quit")
                                  StringReader.
                                  LineNumberingPushbackReader.)
        initial-ns (if ns
                     (symbol ns)
                     (state/get-session-cljs-ns))
        start-repl-fn (fn [driver repl-env repl-options]
                        (driver/start-job! driver job-id)
                        (log/trace "calling cljs.repl/repl* with:\n" (logging/pprint repl-env) (logging/pprint repl-options))
                        (cljs.repl/repl* repl-env repl-options)
                        (driver/stop-job! driver))]
    (binding [*in* code-reader-with-quit
              *out* (state/get-session-binding-value #'*out*)
              *err* (state/get-session-binding-value #'*err*)
              analyzer/*cljs-ns* initial-ns]
      (driver/wrap-repl-with-driver repl-env effective-repl-options start-repl-fn response-fn)
      (let [final-ns analyzer/*cljs-ns*]                                                                                      ; we want analyzer/*cljs-ns* to be sticky between evaluations, that is why we keep it in our session state and bind it
        (if-not (= final-ns initial-ns)
          (state/set-session-cljs-ns! final-ns))))))
