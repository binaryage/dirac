(ns dirac.tests.scenarios.issue-53
  "https://github.com/binaryage/dirac/issues/53"
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.triggers :refer [install-common-triggers!]]
            [dirac.automation.scenario :as scenario]
            [dirac.tests.scenarios.issue-53.core]))

(init-runtime!)
(install-common-triggers!)
(scenario/go-ready!)
