(ns dirac.tests.scenarios.repl
  (:require-macros [cljs.core.async.macros :refer [go]])
  (:require [cljs.core.async :refer [timeout]]
            [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.tests.scenarios.repl.workspace :as workspace]
            [dirac.automation.scenario :as scenario]))

(defn safe-reload! []
  (go
    (<! (timeout 1000))                                                                                                       ; revent "Cannot find context with specified id" V8 errors ?
    (js/window.location.reload)))

(init-runtime!)
(scenario/register-trigger! :reload safe-reload!)
(scenario/register-trigger! :navigate #(set! js/window.location.pathname %))
(scenario/register-trigger! :eval-cljs #(js/dirac.runtime.repl.request-eval-cljs %))
(scenario/register-trigger! :eval-js #(js/dirac.runtime.repl.request-eval-js %))
(scenario/ready!)
