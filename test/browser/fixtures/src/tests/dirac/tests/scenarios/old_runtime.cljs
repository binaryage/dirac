(ns dirac.tests.scenarios.old-runtime
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime! {:old-runtime true})
(scenario/capture-console-as-feedback!)
(scenario/ready!)