(ns dirac.tests.scenarios.issue-74
  "https://github.com/binaryage/dirac/issues/74"
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.triggers :refer [install-common-triggers!]]
            [dirac.automation.scenario :as scenario]
            [dirac.tests.scenarios.issue-74.core]))

(init-runtime!)
(install-common-triggers!)
(scenario/go-ready!)
