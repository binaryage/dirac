(ns dirac.tests.scenarios.normal-with-feedback
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime!)
(scenario/capture-console-as-feedback!)
(scenario/ready!)