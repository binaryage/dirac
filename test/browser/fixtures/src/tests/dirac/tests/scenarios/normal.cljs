(ns dirac.tests.scenarios.normal
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime!)
(scenario/ready!)