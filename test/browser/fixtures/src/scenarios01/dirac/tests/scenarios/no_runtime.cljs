(ns dirac.tests.scenarios.no-runtime
  (:require [dirac.automation.scenario :as scenario]))

(scenario/capture-console-as-feedback!)
(scenario/register-trigger! :navigate #(set! js/window.location.pathname %))
(scenario/ready!)
