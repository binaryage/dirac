(ns dirac.tests.scenarios.no-repl
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime! {:do-not-enable-repl true})
(scenario/capture-console-as-feedback!)
(scenario/ready!)