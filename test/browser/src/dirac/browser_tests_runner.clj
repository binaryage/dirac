(ns dirac.browser-tests-runner
  (:require [clojure.test :refer :all]
            [environ.core :refer [env]]
            [dirac.logging :as logging]
            [dirac.test.agent :as test-agent]
            [dirac.test.nrepl-server :as test-nrepl-server]))

; this test runner runs tests against real chrome browser using chrome driver

(def log-level (or (env :dirac-log-level) (env :dirac-browser-tests-log-level) "INFO"))                                       ; INFO, DEBUG, TRACE, ALL

(defn setup-logging! []
  (logging/setup! {:log-out   :console
                   :log-level log-level}))

(def default-test-namespaces
  ['dirac.browser-tests])

(defn require-namespaces [namespaces]
  (doseq [namespace namespaces]
    (require namespace)))

(defn set-test-runner-present! []
  (System/setProperty "dirac-test-runner" "true"))

(defn -main []
  (set-test-runner-present!)
  (setup-logging!)
  (let [test-namespaces default-test-namespaces]
    (require-namespaces test-namespaces)                                                                                      ; we want to require namespaces dynamically for our loggging configuration to take effect
    (let [summary (apply run-tests test-namespaces)]
      (System/exit (if (successful? summary) 0 1)))))

(defn -dev-main []
  (System/setProperty "dirac-dev" "true")
  (-main))

(defn agent-loop []
  (loop []
    (Thread/sleep 1000)
    (recur)))

(defn run-agent []
  (setup-logging!)
  (test-nrepl-server/with-nrepl-server #(test-agent/with-dirac-agent agent-loop)))