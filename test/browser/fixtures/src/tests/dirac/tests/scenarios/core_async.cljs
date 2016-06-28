(ns dirac.tests.scenarios.core-async
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [cljs.core.async :refer [put! <! chan timeout alts! close!]]))

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

(init-runtime!)
(scenario/register-trigger! :async #(break-async-handler))
(scenario/register-trigger! :async-loop #(break-loop-async-handler))
(scenario/ready!)
