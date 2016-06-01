(ns dirac.tests.scenarios.future-repl-api
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime! {:future-repl-api true})
(scenario/capture-console-as-feedback!)
(scenario/ready!)