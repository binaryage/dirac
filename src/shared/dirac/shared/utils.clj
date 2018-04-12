(ns dirac.shared.utils
  (:require [cljs.env]
            [environ.core :as environ]))

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
  (when (some? cljs.env/*compiler*)
    (= (get-in @cljs.env/*compiler* [:options :optimizations]) :advanced)))

(defmacro when-advanced-mode [& body]
  (when (advanced-mode?)
    `(do ~@body)))

(defmacro when-not-advanced-mode [& body]
  (when-not (advanced-mode?)
    `(do ~@body)))

(defn dirac-test-mode? []
  (some? (:dirac-test-browser environ/env)))

(defmacro when-not-dirac-test-mode [& body]
  (when-not (dirac-test-mode?)
    `(do ~@body)))
