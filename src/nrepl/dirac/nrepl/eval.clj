(ns dirac.nrepl.eval
  (:require [clojure.tools.logging :as log]
            [cljs.repl]
            [cljs.analyzer :as analyzer]
            [cljs.compiler :as compiler]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.driver :as driver]
            [dirac.nrepl.version :refer [version]]
            [dirac.nrepl.compilers :as compilers]
            [dirac.nrepl.protocol :as protocol]
            [dirac.nrepl.helpers :as helpers]
            [dirac.lib.utils :as utils]
            [clojure.tools.reader.reader-types :as readers]
            [clojure.java.io :as io]
            [cljs.source-map :as sm]
            [clojure.string :as string]
            [cuerdas.core :as cuerdas]
            [clojure.data.json :as json])
  (:import clojure.lang.LineNumberingPushbackReader
           java.io.StringReader
           java.io.Writer
           (java.io PushbackReader)
           (javax.xml.bind DatatypeConverter)))

(defn prepare-current-env-info-response []
  (let [session (state/get-current-session)
        current-ns (str analyzer/*cljs-ns*)
        selected-compiler-id (compilers/get-selected-compiler-id session)
        default-compiler-id (compilers/get-default-compiler-id session)]
    (protocol/prepare-current-env-info-response current-ns selected-compiler-id default-compiler-id)))

; -- dirac-specific wrapper for evaluated forms -----------------------------------------------------------------------------

(defn safe-value-conversion-to-string [value]
  ; darwin: I have a feeling that these cljs.core bindings should not be hard-coded.
  ;         I understand that printing must be limited somehow. But this should be user-configurable.
  ;         Dirac REPL does not use returned string value - but normal nREPL clients are affected by this.

  ; note that we are generating named anonymous function and invoke it immediatelly
  ; this generates more friendly call-stack with descriptive frame mentioning "dirac-serialize-eval-result"
  `((fn ~'dirac-serialize-eval-result []
      (binding [cljs.core/*print-level* 1
                cljs.core/*print-length* 10]
        (cljs.core/pr-str ~value)))))

(defn wrap-with-dirac-presentation [job-id form]
  ; note that we are generating named anonymous function and invoke it immediatelly
  ; this generates more friendly call-stack with descriptive frame mentioning "dirac-presentation"
  `((fn ~'dirac-presentation []
      (try
        (js/dirac.runtime.repl.present_repl_result ~job-id ~form)
        (catch :default e#
          (js/dirac.runtime.repl.present_repl_exception ~job-id e#)
          (throw e#))))))

(defn job-evaluator [dirac-wrap job-id form]
  (let [job-fn-sym (symbol (str "dirac-repl-job-" job-id))
        result-sym (gensym "eval-result-")]
    ; note that we are generating named anonymous function and invoke it immediatelly
    ; this generates more friendly call-stack with descriptive frame mentioning "dirac-repl-job-<id>"
    `((fn ~job-fn-sym []
        (try
          ; we want to redirect all side-effect printing to dirac.runtime, so it can be presented in the Dirac REPL console
          (binding [cljs.core/*print-newline* false
                    cljs.core/*print-fn* (partial js/dirac.runtime.repl.present_output ~job-id "stdout" "plain-text")
                    cljs.core/*print-err-fn* (partial js/dirac.runtime.repl.present_output ~job-id "stderr" "plain-text")]
            (let [~result-sym ~(dirac-wrap form)]
              (set! ~'*3 ~'*2)
              (set! ~'*2 ~'*1)
              (set! ~'*1 ~result-sym)
              ~(safe-value-conversion-to-string result-sym)))
          (catch :default e#
            (set! ~'*e e#)
            (throw e#)))))))

(defn special-form-evaluator [dirac-wrap form]
  (safe-value-conversion-to-string (dirac-wrap form)))

(defn make-wrapper-for-form [job-id dirac-mode form]
  (if (and (seq? form) (= 'ns (first form)))
    identity
    (let [dirac-wrap (case dirac-mode
                       "wrap" (partial wrap-with-dirac-presentation job-id)
                       identity)]
      (if ('#{*1 *2 *3 *e} form)
        (partial special-form-evaluator dirac-wrap)
        (partial job-evaluator dirac-wrap job-id)))))

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

(defn sorting-friendly-numeric-job-id [job-id]
  (try
    (cuerdas/pad (str (Long/parseLong (str job-id))) {:length 6 :padding "0"})
    (catch NumberFormatException e)))

(defn sanitize-filename [s]
  (string/replace s #"[.?*!@#$%^&]" "_"))

(defn get-current-repl-filename [job-id]
  (let [compiler-id (compilers/get-selected-compiler-id (state/get-current-session))
        numeric-job-id (sorting-friendly-numeric-job-id job-id)]
    (assert compiler-id)
    (str "_repl/"
         (or (sanitize-filename compiler-id) "unknown") "/"
         (if numeric-job-id (str "job-" numeric-job-id) (sanitize-filename job-id)) ".cljs")))

(defn repl-read! [job-id]
  (let [pushback-reader (PushbackReader. (io/reader *in*))
        filename (get-current-repl-filename job-id)]
    (readers/source-logging-push-back-reader pushback-reader 1 filename)))

; unfortunately I had to copy&paste bunch of code from cljs.repl

; ------ evaluate-form --------> cut here

(defn load-dependencies [repl-env requires opts]
  (doseq [ns (distinct requires)]
    (cljs.repl/load-namespace repl-env ns opts)))

(defn gen-source-map [filename js-filename form]
  (sm/encode*
    {filename (:source-map @compiler/*source-map-data*)}
    {:lines           (+ (:gen-line @compiler/*source-map-data*) 3)
     :file            js-filename
     :sources-content [(or (:source (meta form))
                           ;; handle strings / primitives without metadata
                           (with-out-str (pr form)))]}))

(defn update-source-map [source-map generated-js]
  (-> source-map
      (update "sources" (fn [sources] (conj sources (string/replace (first sources) #"\.cljs$" ".js"))))
      (update "sourcesContent" (fn [contents] (conj contents generated-js)))))

(defn generate-js-with-source-maps! [ast filename form]
  (binding [compiler/*source-map-data* (atom {:source-map (sorted-map)
                                              :gen-col    0
                                              :gen-line   0})]
    (let [js-filename (string/replace filename #"\.cljs$" ".js")
          generated-js (compiler/emit-str ast)
          source-map-json (json/write-str (update-source-map (gen-source-map filename js-filename form) generated-js))]
      (str generated-js
           "\n//# sourceURL=" js-filename
           "\n//# sourceMappingURL=data:application/json;base64,"
           (DatatypeConverter/printBase64Binary (.getBytes source-map-json "UTF-8"))))))

(defn load-dependencies-if-needed! [ast form env repl-env opts]
  (when (#{:ns :ns*} (:op ast))
    (let [ast (analyzer/no-warn (analyzer/analyze env form nil opts))
          requires (into (vals (:requires ast)) (distinct (vals (:uses ast))))]
      (load-dependencies repl-env requires opts))))

(defn evaluate-form [repl-env env filename form wrap opts]
  (binding [analyzer/*cljs-file* filename]
    (let [wrapped-form (wrap form)
          _ (log/trace "wrapped-form:" (utils/pp wrapped-form 100))
          env-with-source-info (assoc env :root-source-info {:source-type :fragment
                                                             :source-form form})
          env-with-source-info-and-repl-env (assoc env-with-source-info
                                              :repl-env repl-env
                                              :def-emits-var (:def-emits-var opts))
          generated-ast (analyzer/analyze env-with-source-info-and-repl-env wrapped-form nil opts)
          generated-js (generate-js-with-source-maps! generated-ast filename form)]
      (log/trace "generated-js:\n" generated-js)
      ;; NOTE: means macros which expand to ns aren't supported for now
      ;; when eval'ing individual forms at the REPL - David
      (load-dependencies-if-needed! generated-ast form env-with-source-info repl-env opts)
      (let [ret (cljs.repl/-evaluate repl-env filename (:line (meta form)) generated-js)]
        (case (:status ret)
          ; darwin: note that :error never happens because dirac runtime supports only :exceptions
          ; we keep it here just for example as an artifact copied from cljs.repl/evaluate-form
          ;
          ;:error (throw
          ;         (ex-info (:value ret)
          ;                  {:type     :js-eval-error
          ;                   :error    ret
          ;                   :repl-env repl-env
          ;                   :form     form}))
          :exception (throw (ex-info (:value ret) {:type     :js-eval-exception
                                                   :error    ret
                                                   :repl-env repl-env
                                                   :form     form
                                                   :js       generated-js}))
          :success (:value ret))))))

; <----- evaluate-form -------- cut-here

(defn repl-eval! [job-id scope-info dirac-mode repl-env env form opts]
  (let [wrapper-fn (or (:wrap opts) (partial make-wrapper-for-form job-id dirac-mode))
        wrapped-form (wrapper-fn form)
        set-env-locals-with-scope (partial set-env-locals scope-info)
        effective-env (-> env set-env-namespace set-env-locals-with-scope)
        filename (get-current-repl-filename job-id)]
    (log/trace "repl-eval! in " filename ":\n" form "\n with env:\n" (utils/pp effective-env 7))
    (evaluate-form repl-env effective-env filename form wrapped-form opts)))

(defn repl-flush! []
  (log/trace "flush-repl!")
  (.flush *out*)
  (.flush *err*))

(defn repl-print! [final-ns-volatile response-fn result]
  (log/trace "repl-print!" result (if-not response-fn "(no response-fn)"))
  ; we have to capture analyzer/*cljs-ns* in print handler because of
  ; https://github.com/clojure/clojurescript/blob/9959ae779dd60ca0b2a7093d1129568f3a658446/src/main/clojure/cljs/repl.cljc#L755
  ; there is no better way I could find, ideally we would want to capture final *cljs-ns* right before binding from above line gets restored
  ; this also explanation why piggieback did it there:
  ; https://github.com/cemerick/piggieback/blob/440b2d03f944f6418844c2fab1e0361387eed543/src/cemerick/piggieback.clj#L183
  ; also see https://github.com/binaryage/dirac/issues/47
  (vreset! final-ns-volatile analyzer/*cljs-ns*)
  (if response-fn
    (let [response (-> (protocol/prepare-printed-value-response result)
                       (merge (prepare-current-env-info-response)))]
      (response-fn response))))                                                                                               ; printed value enhanced with current env info

; -- public api -------------------------------------------------------------------------------------------------------------

(defn eval-in-cljs-repl! [code ns repl-env compiler-env repl-options job-id & [response-fn scope-info dirac-mode]]
  {:pre [(some? job-id)]}
  (let [final-ns-volatile (volatile! nil)
        default-repl-options {:need-prompt  (constantly false)
                              :bind-err     false
                              :quit-prompt  (fn [])
                              :prompt       (fn [])
                              :init         (fn [])
                              :reader       (partial repl-read! job-id)
                              :print        (partial repl-print! final-ns-volatile response-fn)
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
        start-repl-fn (fn [driver caught-fn flush-fn]
                        (let [final-repl-options (assoc effective-repl-options
                                                   :flush (fn []
                                                            (repl-flush!)
                                                            (flush-fn))
                                                   :caught caught-fn)]
                          (log/trace "calling cljs.repl/repl* with:\n"
                                     (utils/pp repl-env)
                                     (utils/pp final-repl-options))
                          (cljs.repl/repl* repl-env final-repl-options)))]
    (binding [*in* code-reader-with-quit
              *out* (state/get-session-binding-value #'*out*)
              *err* (state/get-session-binding-value #'*err*)
              analyzer/*cljs-ns* initial-ns]
      (driver/wrap-with-driver job-id start-repl-fn response-fn "plain-text")
      (if-let [final-ns @final-ns-volatile]                                                                                   ; we want analyzer/*cljs-ns* to be sticky between evaluations
        (if-not (= final-ns initial-ns)
          (state/set-session-cljs-ns! final-ns))))))
