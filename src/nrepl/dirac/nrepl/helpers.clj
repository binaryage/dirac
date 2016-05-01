(ns dirac.nrepl.helpers
  (:require [dirac.nrepl.version :refer [version]]))

(defmacro with-err-output [& body]
  `(binding [*out* *err*]
     ~@body))

(defn get-nrepl-agent-string []
  (str "Dirac nREPL middleware v" version))
