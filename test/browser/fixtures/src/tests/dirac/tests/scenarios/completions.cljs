(ns dirac.tests.scenarios.completions
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.tests.scenarios.completions.workspace :as workspace]
            [dirac.automation.scenario :as scenario]))

(init-runtime!)
(scenario/ready!)
