(ns dirac.tests.scenarios.completions
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [dirac.tests.scenarios.completions.workspace :as workspace]))

(init-runtime!)
(scenario/go-ready!)
