(ns dirac.tests.scenarios.repl
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.tests.scenarios.repl.workspace :as workspace]
            [dirac.automation.scenario :as scenario]
            [dirac.automation.triggers :refer [install-common-triggers!]]))

(init-runtime!)
(install-common-triggers!)
(scenario/ready!)
