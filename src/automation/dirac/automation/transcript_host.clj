(ns dirac.automation.transcript-host)

(def debug? false)

(defmacro debug-log [& args]
  (if debug?
    `(~'log ~@args)))
