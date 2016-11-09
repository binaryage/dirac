(ns dirac.utils
  (:require [cljs.env]))

(defmacro runonce [& body]
  (let [code (cons 'do body)
        code-string (pr-str code)
        code-hash (hash code-string)
        name (symbol (str "runonce_" code-hash))]
    `(defonce ~name {:value ~code
                     :code  ~code-string})))

(defn timeout-display [time-ms]
  {:pre [(number? time-ms)]}
  (format "%.1fs" (/ time-ms 1000.)))

(defn advanced-mode? []
  (if cljs.env/*compiler*
    (= (get-in @cljs.env/*compiler* [:options :optimizations]) :advanced)))

(defmacro when-advanced-mode [& body]
  (if (advanced-mode?)
    `(do ~@body)))

(defmacro when-not-advanced-mode [& body]
  (if-not (advanced-mode?)
    `(do ~@body)))
