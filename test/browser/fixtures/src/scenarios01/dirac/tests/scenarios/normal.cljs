(ns dirac.tests.scenarios.normal
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [dirac.automation.triggers :refer [install-common-triggers!]]))

(init-runtime!)
(install-common-triggers!)
(scenario/ready!)
