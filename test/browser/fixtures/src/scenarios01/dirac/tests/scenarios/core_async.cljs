(ns dirac.tests.scenarios.core-async
  (:require [cljs.core.async :refer [<! alts! chan close! go go-loop put! timeout]]
            [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(defn break-here! []
  (js-debugger))

(defn break-async []
  (go
    (<! (timeout 1000))
    (break-here!)))

(defn break-loop-async [n]
  (go-loop [i 0]
    (if (> i n)
      (break-here!)
      (do
        (<! (timeout 100))
        (recur (inc i))))))

(defn break-async-handler []
  (break-async))

(defn break-loop-async-handler []
  (break-loop-async 20))

; ---------------------------------------------------------------------------------------------------------------------------

(init-runtime! {:override-goog-async-next-tick true})                                                                         ; next-tick implementation differs between Mac/Linux and that would break calls-stack tests
(scenario/register-trigger! :async #(break-async-handler))
(scenario/register-trigger! :async-loop #(break-loop-async-handler))
(scenario/go-ready!)
