(ns dirac.tests.scenarios.breakpoint
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [dirac.tests.scenarios.breakpoint.core :as core]))

(init-runtime!)
(scenario/register-trigger! :pause-on-breakpoint #(core/breakpoint-demo-handler))
(scenario/go-ready!)
