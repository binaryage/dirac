(ns dirac.tests.scenarios.issue-55
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.triggers :refer [install-common-triggers!]]
            [dirac.automation.scenario :as scenario]
            [dirac.tests.scenarios.completions.issue-55 :as issue-55]))

(init-runtime!)
(install-common-triggers!)
(scenario/go-ready!)
