(ns dirac.backend-tests-runner
  (:require [clojure.test :refer :all]
            [dirac.agent-tests]
            [dirac.logging :as logging]))

; this is the default dirac test runner

(def log-level "INFO")                                                                                                        ; INFO, DEBUG, TRACE, ALL

(def default-test-namespaces
  ['dirac.agent-tests])

(defn setup-logging! []
  (logging/setup! {:log-out   :console
                   :log-level log-level}))

(defn -main []
  (setup-logging!)
  (let [summary (apply run-tests default-test-namespaces)]
    (System/exit (if (successful? summary) 0 1))))