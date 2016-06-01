(ns dirac.tests.scenarios.no-runtime
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime! {:do-not-install-runtime true})
(scenario/capture-console-as-feedback!)
(scenario/ready!)