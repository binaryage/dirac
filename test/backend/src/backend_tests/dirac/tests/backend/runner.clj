(ns dirac.tests.backend.runner
  (:require [clansi :refer [style]]
            [clojure.test :refer :all]
            [cuerdas.core :as cuerdas]
            [dirac.logging :as logging]
            [dirac.shared.travis :as travis]
            [dirac.tests.backend.agent.tests]
            [environ.core :refer [env]]))

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

(defn get-timer-name [m]
  (str "timer-" (cuerdas/kebab (ns-name (:ns m)))))

(defmethod clojure.test/report :begin-test-ns [m]
  (let [timer-name (get-timer-name m)
        start-time (travis/current-nano-time)
        timer-id (travis/gen-random-timer-id)]
    (swap! timing-info assoc timer-name {:start-time start-time
                                         :timer-id   timer-id})
    (with-test-out
      (travis/print-and-flush (travis/travis-fold-command "start" (get-fold-name m)))
      (travis/print-and-flush (travis/travis-start-time-command timer-id))
      (println (style (str "Testing " (ns-name (:ns m))) :cyan)))))

(defmethod clojure.test/report :end-test-ns [m]
  (let [timer-name (get-timer-name m)
        timing (get @timing-info timer-name)
        timer-id (:timer-id timing)
        start-time (:start-time timing)
        end-time (travis/current-nano-time)]
    (assert timing)
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

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn -main []
  (setup-logging!)
  (println (style (str "Running backend tests against Clojure " (clojure-version)) :blue))
  (let [summary (apply run-tests default-test-namespaces)]
    (System/exit (if (successful? summary) 0 1))))
