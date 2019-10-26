(ns dirac.tests.browser.runner
  (:require [clansi :refer [style]]
            [clojure.test :refer :all]
            [dirac.logging :as logging]
            [dirac.test-lib.agent :refer [with-dirac-agent]]
            [dirac.test-lib.chrome-browser :refer [with-browser]]
            [dirac.test-lib.fixtures-web-server :refer [with-fixtures-web-server]]
            [dirac.test-lib.nrepl-server :refer [with-nrepl-server]]
            [dirac.test-lib.shadow-cljs :refer [with-shadow-server]]
            [dirac.test-lib.taxi :refer [with-taxi-setup]]
            [dirac.tests.browser.tasks.transcript-streamer-server :refer [with-transcript-streamer-server]]
            [environ.core :refer [env]]
            [clojure.tools.logging :as log])
  (:import (java.util.logging Level Logger)))

; this test runner runs tests against real chrome browser using chrome driver

(def setup-fixtures! (join-fixtures [with-transcript-streamer-server
                                     with-fixtures-web-server
                                     with-shadow-server
                                     with-nrepl-server
                                     with-dirac-agent
                                     with-browser
                                     with-taxi-setup]))

(def setup-dev-fixtures! (join-fixtures [with-shadow-server
                                         with-nrepl-server
                                         with-dirac-agent]))

(def log-level (or (env :dirac-log-level)
                   (env :dirac-browser-tests-log-level) "INFO"))                                                              ; INFO, DEBUG, TRACE, ALL

(def pinned-loggers (atom {}))                                                                                                ; see https://stackoverflow.com/a/40934452/84283
(defn pin-logger! [name]
  (let [logger (Logger/getLogger name)]
    (assert logger)
    (swap! pinned-loggers assoc name logger)
    logger))

(defn make-selenium-logger-less-verbose! []
  (let [selenium-logger (pin-logger! "org.openqa.selenium")]
    (.setLevel selenium-logger Level/WARNING)))

(defn setup-logging! []
  (logging/setup! {:log-out   :console
                   :log-level log-level})
  (make-selenium-logger-less-verbose!))

(def default-test-namespaces
  ['dirac.tests.browser.tasks.tests])

(defn require-namespaces [namespaces]
  (doseq [namespace namespaces]
    (require namespace)))

(defn set-test-runner-present! []
  (System/setProperty "dirac-test-runner" "true"))

(defmethod clojure.test/report :begin-test-ns [m]
  (with-test-out
    (println (style (str "Testing " (ns-name (:ns m))) :cyan))))

(defmethod clojure.test/report :summary [m]
  (let [assertions-count (+ (:pass m) (:fail m) (:error m))
        failed? (or (pos? (:fail m)) (pos? (:error m)))
        report-style (if failed? :red :green)
        status (if failed?
                 (str (:fail m) " failures, " (:error m) " errors.")
                 "all passed.")]
    (with-test-out
      (println (style (str "Ran " (:test m) " tests containing " assertions-count " assertions => " status) report-style)))))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(defn run-tests! []
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
  (log/debug (str "run-agent called in dir '" (System/getProperty "user.dir") "'"))
  (log/debug "CLASSPATH" (clojure.string/join "\n" (seq (.getURLs (ClassLoader/getSystemClassLoader)))))
  (setup-dev-fixtures! agent-loop))
