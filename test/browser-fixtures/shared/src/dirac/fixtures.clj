(ns dirac.fixtures)

(defmacro without-transcript [& body]
  `(dirac.fixtures/without-transcript-work (fn [] ~@body)))

