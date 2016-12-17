(ns dirac.tests.backend.runner
  (:require [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [environ.core :refer [env]]
            [dirac.tests.backend.agent.tests]
            [dirac.travis :as travis]
            [dirac.logging :as logging]
            [cuerdas.core :as cuerdas]
            [clansi :refer [style]]))

; this is the default dirac test runner

(def log-level (or (env :dirac-log-level) (env :dirac-backend-tests-log-level) "INFO"))                                       ; INFO, DEBUG, TRACE, ALL

(def default-test-namespaces
  ['dirac.tests.backend.agent.tests])

(defn setup-logging! []
  (logging/setup! {:log-out   :console
                   :log-level log-level}))

; -- custom reporting -------------------------------------------------------------------------------------------------------

(defn get-fold-name [m]
  (cuerdas/kebab (ns-name (:ns m))))

(defmethod clojure.test/report :begin-test-ns [m]
  (with-test-out
    (print (travis/travis-fold-command "start" (get-fold-name m)))
    (println (style (str "Testing " (ns-name (:ns m))) :cyan))))

(defmethod clojure.test/report :end-test-ns [m]
  (print (travis/travis-fold-command "end" (get-fold-name m))))

(defmethod clojure.test/report :summary [m]
  (let [assertions-count (+ (:pass m) (:fail m) (:error m))
        failed? (or (pos? (:fail m)) (pos? (:error m)))
        report-style (if failed? :red :green)
        status (if failed?
                 (str (:fail m) " failures, " (:error m) " errors.")
                 "all passed.")]
    (with-test-out
      (println (style (str "Ran " (:test m) " tests containing " assertions-count " assertions => " status) report-style)))))

; -- main entrypoint --------------------------------------------------------------------------------------------------------

(defn -main []
  (setup-logging!)
  (println (style (str "Running backend tests against Clojure " (clojure-version)) :blue))
  (let [summary (apply run-tests default-test-namespaces)]
    (System/exit (if (successful? summary) 0 1))))
