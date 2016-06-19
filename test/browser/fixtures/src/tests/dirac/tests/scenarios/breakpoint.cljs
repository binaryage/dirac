(ns dirac.tests.scenarios.breakpoint
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.tests.scenarios.breakpoint.core :as core]
            [dirac.automation.scenario :as scenario]))

(init-runtime!)
(scenario/register-trigger! :pause-on-breakpoint #(core/breakpoint-demo-handler))
(scenario/ready!)
