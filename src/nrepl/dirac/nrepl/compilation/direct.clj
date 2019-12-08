(ns dirac.nrepl.compilation.direct
  (:require [cljs.analyzer :as analyzer]
            [cljs.compiler :as compiler]
            [cljs.source-map :as sm]
            [cljs.repl]
            [clojure.string :as string]
            [clojure.data.json :as json]
            [clojure.tools.logging :as log]
            [dirac.lib.utils :as utils])
  (:import (java.util.concurrent.atomic AtomicLong)
           (java.util Base64)))

; here we wrap direct usage of cljs analyzer and compiler

; unfortunately I had to copy&paste bunch of code from cljs.repl
; because I needed to implement inlined source-maps and there was no good way how to do it via cljs.repl

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

(defmacro bind-compiler-source-map-data-gen-col-optionally [& body]
  (if (some? (ns-resolve 'cljs.compiler '*source-map-data-gen-col*))
    `(binding [cljs.compiler/*source-map-data-gen-col* (AtomicLong.)]
       ~@body)
    `(do
       ~@body)))

(defmacro bind-compiler-source-map-data [& body]
  `(binding [cljs.compiler/*source-map-data* (atom {:source-map (sorted-map)
                                                    :gen-col    0
                                                    :gen-line   0})]
     ~@body))

(defn generate-js-with-source-maps! [ast filename form]
  (bind-compiler-source-map-data
    (bind-compiler-source-map-data-gen-col-optionally                                                                         ; see https://github.com/binaryage/dirac/issues/81
      (let [js-filename (string/replace filename #"\.cljs$" ".js")
            generated-js (compiler/emit-str ast)
            source-map-json (json/write-str (gen-source-map filename js-filename form))]
        (str generated-js
             "\n//# sourceURL=" js-filename
             "\n//# sourceMappingURL=data:application/json;base64,"
             (.encodeToString (Base64/getEncoder) (.getBytes source-map-json "UTF-8")))))))

(defn load-dependencies-if-needed! [ast form env repl-env opts]
  (when (#{:ns :ns*} (:op ast))
    (let [ast (analyzer/no-warn (analyzer/analyze env form nil opts))
          requires (into (vals (:requires ast)) (distinct (vals (:uses ast))))]
      (load-dependencies repl-env requires opts))))

(defn generate-js-and-load-dependencies-if-needed! [repl-env compiler-env filename form compiler-opts]
  (log/trace "generate-js-and-load-dependencies!:\n" (utils/pp form 100))
  (binding [analyzer/*cljs-file* filename]
    (let [compiler-env-with-source-info (assoc compiler-env :root-source-info {:source-type :fragment
                                                                               :source-form form})
          compiler-env-with-source-info-and-repl-env (assoc compiler-env-with-source-info
                                                       :repl-env repl-env
                                                       :def-emits-var (:def-emits-var compiler-opts))
          generated-ast (analyzer/analyze compiler-env-with-source-info-and-repl-env form nil compiler-opts)
          generated-js (generate-js-with-source-maps! generated-ast filename form)]
      (log/trace "generated-js:\n" generated-js)
      ;; NOTE: means macros which expand to ns aren't supported for now
      ;; when eval'ing individual forms at the REPL - David
      (load-dependencies-if-needed! generated-ast form compiler-env-with-source-info repl-env compiler-opts)
      generated-js)))

; <----- evaluate-form -------- cut-here

; -- compilation API --------------------------------------------------------------------------------------------------------

(defmacro setup-current-ns [ns & forms]
  `(binding [analyzer/*cljs-ns* ~ns]
     ~@forms))

(defmacro get-current-ns []
  `(do analyzer/*cljs-ns*))

(defmacro get-ns [ns]
  `(analyzer/get-namespace ~ns))

(defmacro generate-js [repl-env compiler-env filename form compiler-opts]
  `(generate-js-and-load-dependencies-if-needed! ~repl-env ~compiler-env ~filename ~form ~compiler-opts))
