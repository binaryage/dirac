(ns dirac.backend-tests-runner
  (:require [clojure.test :refer :all]
            [dirac.agent-tests]))

; this is the default dirac test runner

(def default-test-namespaces
  ['dirac.agent-tests])

(defn -main []
  (let [summary (apply run-tests default-test-namespaces)]
    (System/exit (if (successful? summary) 0 1))))