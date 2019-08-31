(ns dirac-lein.logging)

(defmacro log [& args]
  `(do (.log js/console ~@args) nil))