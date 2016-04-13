(ns dirac.utils)

(defmacro runonce [& body]
  (let [name (gensym "runonce_")]
    `(defonce ~name (do ~@body))))
