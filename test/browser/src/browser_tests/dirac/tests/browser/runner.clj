(ns dirac.tests.browser.runner
  (:require [clojure.test :refer :all]
            [environ.core :refer [env]]
            [clojure.tools.logging :as log]
            [dirac.logging :as logging]
            [dirac.test-lib.agent :as test-agent]
            [dirac.test-lib.chrome-browser :refer [with-browser]]
            [dirac.test-lib.fixtures-web-server :refer [with-fixtures-web-server]]
            [dirac.test-lib.nrepl-server :refer [with-nrepl-server]]
            [dirac.test-lib.agent :refer [with-dirac-agent]]
            [dirac.test-lib.taxi :refer [with-taxi-setup]]
            [dirac.test-lib.nrepl-server :as test-nrepl-server]
            [dirac.tests.browser.tasks.transcript-streamer-server :refer [with-transcript-streamer-server]]))

; this test runner runs tests against real chrome browser using chrome driver

(def setup-fixtures! (join-fixtures [with-transcript-streamer-server
                                     with-fixtures-web-server
                                     with-nrepl-server
                                     with-dirac-agent
                                     with-browser
                                     with-taxi-setup]))

(def log-level (or (env :dirac-log-level)
                   (env :dirac-browser-tests-log-level) "INFO"))                                                              ; INFO, DEBUG, TRACE, ALL

(defn setup-logging! []
  (logging/setup! {:log-out   :console
                   :log-level log-level}))

(def default-test-namespaces
  ['dirac.tests.browser.tasks.tests])

(defn require-namespaces [namespaces]
  (doseq [namespace namespaces]
    (require namespace)))

(defn set-test-runner-present! []
  (System/setProperty "dirac-test-runner" "true"))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(defn run-tests! []
  (log/info "---------------------------------------------------------------------------------------------------------------")
  (log/info "Running browser test tasks...")
  (let [test-namespaces default-test-namespaces]
    (require-namespaces test-namespaces)                                                                                      ; we want to require namespaces dynamically for our loggging configuration to take effect
    (let [summary (apply run-tests test-namespaces)]
      (if-not (successful? summary)
        (System/exit 1)))))

(defn -main []
  (set-test-runner-present!)
  (setup-logging!)
  (setup-fixtures! run-tests!)
  (System/exit 0))

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
