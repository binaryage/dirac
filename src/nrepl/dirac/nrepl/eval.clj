(ns dirac.nrepl.eval
  (:require [clojure.tools.logging :as log]
            [cljs.repl]
            [clojure.tools.reader]
            [cljs.analyzer :as analyzer]
            [cljs.compiler :as compiler]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.driver :as driver]
            [dirac.nrepl.version :refer [version]]
            [dirac.nrepl.compilers :as compilers]
            [dirac.nrepl.protocol :as protocol]
            [dirac.lib.utils :as utils]
            [clojure.tools.reader.reader-types :as readers]
            [cljs.source-map :as sm]
            [clojure.string :as string]
            [cuerdas.core :as cuerdas]
            [clojure.data.json :as json])
  (:import java.io.StringReader
           (javax.xml.bind DatatypeConverter)))

(defn prepare-current-env-info-response []
  (let [session (state/get-current-session)
        current-ns (str analyzer/*cljs-ns*)
        selected-compiler-id (compilers/get-selected-compiler-id session)
        default-compiler-id (compilers/get-default-compiler-id session)]
    (protocol/prepare-current-env-info-response current-ns selected-compiler-id default-compiler-id)))

; -- dirac-specific wrapper for evaluated forms -----------------------------------------------------------------------------

(defn gen-form-eval [job-id eval-mode dirac-mode form]
  (let [job-fn-display-name (symbol (str "repl-job-" job-id))]                                                                ; this is just for better stack-traces
    `(js/dirac.runtime.repl.eval ~job-id ~eval-mode ~dirac-mode (fn ~job-fn-display-name [] ~form))))

(defn special-form? [form]
  (contains? '#{*1 *2 *3 *e} form))

(defn ns-related-form? [form]
  (and (seq? form) (contains? #{'ns 'require 'require-macros 'use 'use-macros 'import 'refer-clojure} (first form))))         ; note: we should keep this in sync with `cljs.repl/wrap-fn`

(defn wrap-form [job-id dirac-mode form]
  (if (ns-related-form? form)
    form                                                                                                                      ; ns or require rely on cljs.analyzer/*allow-ns*, so we must not wrap them
    (gen-form-eval job-id (if (special-form? form) "special" "captured") dirac-mode form)))

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
  (string/replace s #"[.?*!@#$%^&]" "-"))

(defn get-current-repl-filename [job-id iteration]
  (let [compiler-id (compilers/get-selected-compiler-id (state/get-current-session))
        sanitized-compiler-id (or (sanitize-filename compiler-id) "unknown")
        numeric-job-id (sorting-friendly-numeric-job-id job-id)
        sanitized-repl-job-name (if numeric-job-id (str "repl-job-" numeric-job-id) (sanitize-filename job-id))
        iteration-str (if (> iteration 1) (str "-" iteration))]
    (assert compiler-id)
    (str "repl://dirac-repl/" sanitized-compiler-id "/" sanitized-repl-job-name iteration-str ".cljs")))

(defn repl-prepare-reader! [job-id counter-volatile reader]
  ; note that repl-prepare-reader! is called for every form read from input
  ; e.g. code "1 2 3 :cljs/quit" will call repl-prepare-reader! four times
  (let [iteration (vswap! counter-volatile inc)
        filename (get-current-repl-filename job-id iteration)
        reader (readers/source-logging-push-back-reader reader 1 filename)]
    (log/trace (str "repl-prepare-reader! (" job-id "/" iteration ")\n") (utils/pp reader))
    reader))

; unfortunately CLJS-1572 introduced some problem I was unable to resolve
; https://github.com/clojure/clojurescript/commit/dfadee51fa3fad58b7c4cf7de532e9a10e0f802f#diff-37f2c970502705d61a0ab1f75ce8fe12R109
; calling unread on *in* was causing https://gist.github.com/darwin/e5adfa335dd382289526410dfcac4ff9
; I decided to use the original implementation instead, because I have resolved the multi-forms problem on my own before:
; https://github.com/binaryage/dirac/commit/826dc3c63054f0ae7af89c387c884e0108382da8
(defn repl-read-prior-CLJS-1572
  ([request-prompt request-exit]
   (repl-read-prior-CLJS-1572 request-prompt request-exit cljs.repl/*repl-opts*))
  ([request-prompt request-exit opts]
   (binding [*in* (if (true? (:source-map-inline opts))
                    ((:reader opts))
                    *in*)]
     (or ({:line-start request-prompt :stream-end request-exit}
           (cljs.repl/skip-whitespace *in*))
         (let [input (clojure.tools.reader/read {:read-cond :allow :features #{:cljs}} *in*)]
           (cljs.repl/skip-if-eol *in*)
           input)))))

(defn repl-read! [job-id & args]
  (let [result (apply repl-read-prior-CLJS-1572 args)]
    (log/trace (str "repl-read! (" job-id ")\n") (utils/pp result))
    result))

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

(defn generate-js-with-source-maps! [ast filename form]
  (binding [compiler/*source-map-data* (atom {:source-map (sorted-map)
                                              :gen-col    0
                                              :gen-line   0})]
    (let [js-filename (string/replace filename #"\.cljs$" ".js")
          generated-js (compiler/emit-str ast)
          source-map-json (json/write-str (gen-source-map filename js-filename form))]
      (str generated-js
           "\n//# sourceURL=" js-filename
           "\n//# sourceMappingURL=data:application/json;base64,"
           (DatatypeConverter/printBase64Binary (.getBytes source-map-json "UTF-8"))))))

(defn load-dependencies-if-needed! [ast form env repl-env opts]
  (when (#{:ns :ns*} (:op ast))
    (let [ast (analyzer/no-warn (analyzer/analyze env form nil opts))
          requires (into (vals (:requires ast)) (distinct (vals (:uses ast))))]
      (load-dependencies repl-env requires opts))))

(defn prepare-error-data [type error repl-env form generated-js]
  {:type     type
   :error    error
   :repl-env repl-env
   :form     form
   :js       generated-js})

(defn evaluate-form [repl-env env filename form wrap opts]
  (binding [analyzer/*cljs-file* filename]
    (let [wrapped-form (wrap form)
          _ (log/trace "wrapped-form:\n" (utils/pp wrapped-form 100))
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
      (let [result (cljs.repl/-evaluate repl-env filename (:line (meta form)) generated-js)]
        (case (:status result)
          :error (throw (ex-info (:value result) (prepare-error-data :js-eval-error result repl-env form generated-js)))
          :exception (throw (ex-info (:value result) (prepare-error-data :js-eval-exception result repl-env form generated-js)))
          :success (:value result))))))

; <----- evaluate-form -------- cut-here

(defn repl-eval! [job-id counter-volatile scope-info dirac-mode repl-env env form opts]
  (let [form-wrapper-fn (or (:wrap opts) (partial wrap-form job-id dirac-mode))
        set-env-locals-with-scope (partial set-env-locals scope-info)
        effective-env (-> env set-env-namespace set-env-locals-with-scope)
        filename (get-current-repl-filename job-id @counter-volatile)]
    (log/trace "repl-eval! in " filename ":\n" form "\n with env:\n" (utils/pp effective-env 7))
    (evaluate-form repl-env effective-env filename form form-wrapper-fn opts)))

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
  (when (some? response-fn)
    (let [response (-> (protocol/prepare-printed-value-response result)
                       (merge (prepare-current-env-info-response)))]
      (response-fn response))))                                                                                               ; printed value enhanced with current env info

; -- public api -------------------------------------------------------------------------------------------------------------

(defn eval-in-cljs-repl! [code ns repl-env compiler-env repl-options job-id & [response-fn scope-info dirac-mode]]
  {:pre [(some? job-id)]}
  (log/trace "eval-in-cljs-repl! " ns "\n" code)
  (let [final-ns-volatile (volatile! nil)
        counter-volatile (volatile! 0)
        ; MAJOR TRICK HERE!
        ; we append :cljs/quit to our code which should be evaluated
        ; this will cause cljs.repl loop to exit after the first eval
        code-reader-with-quit (-> (str code " :cljs/quit")
                                  (StringReader.))
        default-repl-options {:need-prompt  (constantly false)
                              :bind-err     false
                              :quit-prompt  (fn [])
                              :prompt       (fn [])
                              :init         (fn [])
                              :read         (partial repl-read! job-id)
                              :reader       (partial repl-prepare-reader! job-id counter-volatile code-reader-with-quit)
                              :print        (partial repl-print! final-ns-volatile response-fn)
                              :eval         (partial repl-eval! job-id counter-volatile scope-info dirac-mode)
                              :compiler-env compiler-env}
        effective-repl-options (merge default-repl-options repl-options)
        initial-ns (if (some? ns)
                     (symbol ns)
                     (state/get-session-cljs-ns))
        start-repl-fn (fn [_driver caught-fn flush-fn]
                        (let [final-repl-options (assoc effective-repl-options
                                                   :flush (fn []
                                                            (repl-flush!)
                                                            (flush-fn))
                                                   :caught caught-fn)]
                          (log/trace "calling cljs.repl/repl* with:\n"
                                     (utils/pp repl-env)
                                     (utils/pp final-repl-options))
                          (cljs.repl/repl* repl-env final-repl-options)))]
    (binding [*out* (state/get-session-binding-value #'*out*)
              *err* (state/get-session-binding-value #'*err*)
              analyzer/*cljs-ns* initial-ns]
      (driver/wrap-with-driver job-id start-repl-fn response-fn "plain-text")
      (when-some [final-ns @final-ns-volatile]                                                                                   ; we want analyzer/*cljs-ns* to be sticky between evaluations
        (when-not (= final-ns initial-ns)
          (state/set-session-cljs-ns! final-ns))))))
