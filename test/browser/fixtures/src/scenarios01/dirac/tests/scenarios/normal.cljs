(ns dirac.tests.scenarios.normal
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime!)
(scenario/register-trigger! :reload #(js/window.location.reload))
(scenario/register-trigger! :navigate #(set! js/window.location.pathname %))
(scenario/register-trigger! :eval-cljs #(js/dirac.runtime.repl.request-eval-cljs %))
(scenario/register-trigger! :eval-js #(js/dirac.runtime.repl.request-eval-js %))
(scenario/ready!)
