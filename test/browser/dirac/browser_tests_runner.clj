(ns dirac.browser-tests-runner
  (:require [clojure.test :refer :all]
            [clj-logging-config.log4j :as config]))

; this alternative test runner runs tests against real chrome browser

(def default-test-namespaces
  ['dirac.browser-tests])

(defn require-namespaces [namespaces]
  (doseq [namespace namespaces]
    (require namespace)))

(defn set-test-runner-present! []
  (System/setProperty "dirac-test-runner" "true"))

(defn -main []
  (set-test-runner-present!)
  (config/set-loggers! :root {:level :info})
  (let [test-namespaces default-test-namespaces]
    (require-namespaces test-namespaces)                                                                                      ; we want to require namespaces dynamically for our loggging configuration to take effect
    (let [summary (apply run-tests test-namespaces)]
      (System/exit (if (successful? summary) 0 1)))))

(defn -dev-main []
  (set-test-runner-present!)
  (System/setProperty "dirac-dev" "true")
  (-main))