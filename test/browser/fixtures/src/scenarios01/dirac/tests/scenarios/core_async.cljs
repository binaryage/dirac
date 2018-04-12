(ns dirac.tests.scenarios.core-async
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [cljs.core.async :refer [put! <! chan timeout alts! close! go go-loop]]))

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
