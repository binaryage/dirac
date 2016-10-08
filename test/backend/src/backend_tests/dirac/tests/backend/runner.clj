(ns dirac.tests.backend.runner
  (:require [clojure.test :refer :all]
            [environ.core :refer [env]]
            [dirac.tests.backend.agent.tests]
            [dirac.logging :as logging]
            [clojure.tools.logging :as log]))

; this is the default dirac test runner

(def log-level (or (env :dirac-log-level) (env :dirac-backend-tests-log-level) "INFO"))                                       ; INFO, DEBUG, TRACE, ALL

(def default-test-namespaces
  ['dirac.tests.backend.agent.tests])

(defn setup-logging! []
  (logging/setup! {:log-out   :console
                   :log-level log-level}))

(defn -main []
  (setup-logging!)
  (log/info (str "Running tests against Clojure " (clojure-version)))
  (let [summary (apply run-tests default-test-namespaces)]
    (System/exit (if (successful? summary) 0 1))))
