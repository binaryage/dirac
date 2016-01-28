(ns dirac.browser-tests-runner
  (:require [clojure.test :refer :all]
            [dirac.browser-tests]))

; this alternative test runner runs tests against real chrome browser

(def default-test-namespaces
  ['dirac.browser-tests])

(defn -main []
  (let [summary (apply run-tests default-test-namespaces)]
    (System/exit (if (successful? summary) 0 1))))