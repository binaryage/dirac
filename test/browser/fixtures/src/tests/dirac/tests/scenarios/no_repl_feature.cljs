(ns dirac.tests.scenarios.no-repl-feature
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(init-runtime! {:do-not-enable-repl true})
(scenario/ready!)