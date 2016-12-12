(ns dirac.tests.backend.runner
  (:require [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [environ.core :refer [env]]
            [dirac.tests.backend.agent.tests]
            [dirac.travis :as travis]
            [dirac.logging :as logging]
            [cuerdas.core :as cuerdas]))

; this is the default dirac test runner

(def log-level (or (env :dirac-log-level) (env :dirac-backend-tests-log-level) "INFO"))                                       ; INFO, DEBUG, TRACE, ALL

(def default-test-namespaces
  ['dirac.tests.backend.agent.tests])

(defn setup-logging! []
  (logging/setup! {:log-out   :console
                   :log-level log-level}))

(defn get-fold-name [m]
  (cuerdas/kebab (ns-name (:ns m))))

(defmethod clojure.test/report :begin-test-ns [m]
  (with-test-out
    (println)
    (print (travis/travis-fold-command "start" (get-fold-name m)))
    (println "Testing" (ns-name (:ns m)))))

(defmethod clojure.test/report :end-test-ns [m]
  (print (travis/travis-fold-command "end" (get-fold-name m))))

(defn -main []
  (setup-logging!)
  (println (str "Running backend tests against Clojure " (clojure-version)))
  (let [summary (apply run-tests default-test-namespaces)]
    (System/exit (if (successful? summary) 0 1))))
