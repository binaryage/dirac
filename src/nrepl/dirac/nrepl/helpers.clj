(ns dirac.nrepl.helpers
  (:require [dirac.nrepl.version :refer [version]])
  (:import (java.util UUID)
           (java.io StringWriter PrintWriter)))

(defmacro with-err-output [& body]
  `(binding [*out* *err*]
     ~@body))

(defn error-println [& args]
  (with-err-output
    (apply println args)))

(defn get-nrepl-info []
  (str "Dirac nREPL middleware v" version))

(defn generate-uuid []
  (str (UUID/randomUUID)))

(defn get-printed-stack-trace []
  (try
    (throw (Throwable. ""))
    (catch Throwable e
      (let [string-writer (StringWriter.)
            writer (PrintWriter. string-writer)]
        (.printStackTrace e writer)
        (str string-writer)))))
