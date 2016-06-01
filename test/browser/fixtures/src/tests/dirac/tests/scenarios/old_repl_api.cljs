(ns dirac.tests.scenarios.old-repl-api
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime! {:old-repl-api true})
(scenario/capture-console-as-feedback!)
(scenario/ready!)