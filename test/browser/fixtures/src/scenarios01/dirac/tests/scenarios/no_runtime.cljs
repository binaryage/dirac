(ns dirac.tests.scenarios.no-runtime
  (:require [dirac.automation.scenario :as scenario]
            [dirac.automation.triggers :refer [install-common-triggers!]]))

(scenario/capture-console-as-feedback!)
(install-common-triggers!)
(scenario/ready!)
