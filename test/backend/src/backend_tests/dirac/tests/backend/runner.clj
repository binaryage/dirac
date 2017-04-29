(ns dirac.tests.backend.runner
  (:require [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [environ.core :refer [env]]
            [dirac.tests.backend.agent.tests]
            [dirac.travis :as travis]
            [dirac.logging :as logging]
            [cuerdas.core :as cuerdas]
            [clansi :refer [style]])
  (:import (java.time Instant)))

; this is the default dirac test runner

(def log-level (or (env :dirac-log-level) (env :dirac-backend-tests-log-level) "INFO"))                                       ; INFO, DEBUG, TRACE, ALL

(def default-test-namespaces
  ['dirac.tests.backend.agent.tests])

(defn setup-logging! []
  (logging/setup! {:log-out   :console
                   :log-level log-level}))

(def timing-info (atom {}))

; -- custom reporting -------------------------------------------------------------------------------------------------------

(defn get-fold-name [m]
  (cuerdas/kebab (ns-name (:ns m))))

(defn get-timer-id [m]
  (str "timer-" (cuerdas/kebab (ns-name (:ns m)))))

(defmethod clojure.test/report :begin-test-ns [m]
  (let [start-time (travis/current-nano-time)
        timer-id (get-timer-id m)]
    (swap! timing-info assoc timer-id start-time)
    (with-test-out
      (travis/print-and-flush (travis/travis-fold-command "start" (get-fold-name m)))
      (travis/print-and-flush (travis/travis-start-time-command timer-id))
      (println (style (str "Testing " (ns-name (:ns m))) :cyan)))))

(defmethod clojure.test/report :end-test-ns [m]
  (let [timer-id (get-timer-id m)
        start-time (get @timing-info timer-id)
        end-time (travis/current-nano-time)]
    (assert start-time)
    (travis/print-and-flush (travis/travis-end-time-command timer-id start-time end-time)))
  (travis/print-and-flush (travis/travis-fold-command "end" (get-fold-name m))))

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
