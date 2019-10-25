(ns dirac.nrepl.compilation
  "We want to abstract cljs code compilation to support different compilation engines.
   Depending on compiler-env eval-in-cljs-repl! might decide to use direct compilation or shadow-cljs compilation."
  (:require [dirac.nrepl.compilation.direct :as direct]))

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
    ::shadow (assert "TODO")))

(defmacro get-current-ns []
  `(case (get-compilation-mode)
     ::direct (direct/get-current-ns)
     ::shadow (assert "TODO")))

(defmacro get-ns [ns]
  `(case (get-compilation-mode)
     ::direct (direct/get-ns ~ns)
     ::shadow (assert "TODO")))

(defmacro generate-js [repl-env compiler-env filename form compiler-opts]
  `(case (get-compilation-mode)
     ::direct (direct/generate-js ~repl-env ~compiler-env ~filename ~form ~compiler-opts)
     ::shadow (assert "TODO")))
