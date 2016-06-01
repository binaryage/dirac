(ns dirac.tests.scenarios.future-runtime
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime! {:future-runtime true})
(scenario/capture-console-as-feedback!)
(scenario/ready!)