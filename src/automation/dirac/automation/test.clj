(ns dirac.automation.test)

(defmacro with-captured-output [& body]
  `(-> (cljs.core/with-out-str ~@body)
       (dirac.utils/strip-last-nl)
       (dirac.utils/trim-leading-nls)))