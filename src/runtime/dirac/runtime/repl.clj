(ns dirac.runtime.repl)

(defmacro with-safe-printing [& body]
  `(binding [cljs.core/*print-level* (dirac.runtime.prefs/pref :safe-print-level)
             cljs.core/*print-length* (dirac.runtime.prefs/pref :safe-print-length)]
     ~@body))
