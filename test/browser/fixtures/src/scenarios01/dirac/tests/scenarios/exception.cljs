(ns dirac.tests.scenarios.exception
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [dirac.tests.scenarios.exception.core :as core]))

(init-runtime!)
(scenario/register-trigger! :cause-exception #(core/exception-demo-handler))
(scenario/register-trigger! :break #(core/breakpoint-demo-handler))
(scenario/go-ready!)
