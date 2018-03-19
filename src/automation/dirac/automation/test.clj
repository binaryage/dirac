(ns dirac.automation.test)

(defmacro with-captured-output [& body]
  `(-> (cljs.core/with-out-str ~@body)
       (dirac.shared.utils/strip-last-nl)
       (dirac.shared.utils/trim-leading-nls)))
