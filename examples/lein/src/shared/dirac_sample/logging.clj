(ns dirac-sample.logging)

(defmacro log [& args]
  `(do (.log js/console ~@args) nil))