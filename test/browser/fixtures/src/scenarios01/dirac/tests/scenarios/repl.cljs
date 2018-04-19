(ns dirac.tests.scenarios.repl
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [dirac.automation.triggers :refer [install-common-triggers!]]
            [dirac.tests.scenarios.repl.workspace :as workspace]))

(init-runtime!)
(install-common-triggers!)
(scenario/go-ready!)
