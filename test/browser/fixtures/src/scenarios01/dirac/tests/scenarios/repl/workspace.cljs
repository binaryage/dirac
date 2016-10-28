(ns dirac.tests.scenarios.repl.workspace)

(enable-console-print!)

(defn hello! [s]
  (println (str "Hello, " (or s "World") "!")))
