(ns dirac.nrepl.compilation
  "We want to abstract cljs code compilation to support different compilation engines.
   Depending on compiler-env eval-in-cljs-repl! might decide to use direct compilation or shadow-cljs compilation."
  (:require [dirac.nrepl.compilation.direct :as direct]
            [dirac.nrepl.compilation.shadow :as shadow]))

; -- compilation mode -------------------------------------------------------------------------------------------------------

(def ^:dynamic *mode*)

(defmacro wrap-with-compilation-mode [mode & forms]
  `(binding [*mode* ~mode]
     ~@forms))

(defn get-compilation-mode []
  *mode*)

; -- public API -------------------------------------------------------------------------------------------------------------

(defmacro setup-compilation-mode [shadow? & forms]
  `(wrap-with-compilation-mode (if ~shadow? ::shadow ::direct) ~@forms))

(defmacro setup-current-ns [ns & forms]
  `(case (get-compilation-mode)
     ::direct (direct/setup-current-ns ~ns ~@forms)
     ::shadow (shadow/setup-current-ns ~ns ~@forms)))

(defmacro get-current-ns []
  `(case (get-compilation-mode)
     ::direct (direct/get-current-ns)
     ::shadow (shadow/get-current-ns)))

(defmacro generate-js [repl-env compiler-env filename form compiler-opts]
  `(case (get-compilation-mode)
     ::direct (direct/generate-js ~repl-env ~compiler-env ~filename ~form ~compiler-opts)
     ::shadow (shadow/generate-js ~repl-env ~compiler-env ~filename ~form ~compiler-opts)))

(defmacro launch-repl [repl-env opts]
  `(case (get-compilation-mode)
     ::direct (cljs.repl/repl* ~repl-env ~opts)
     ::shadow (shadow/cljs-repl-shim ~repl-env ~opts)))
