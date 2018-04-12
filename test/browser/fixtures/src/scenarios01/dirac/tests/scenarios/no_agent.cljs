(ns dirac.tests.scenarios.no-agent
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

; deliberately mis-configure agent port to simulate "agent not listening on port" situation
(init-runtime! {:runtime-prefs {:agent-port 9999}})
(scenario/go-ready!)
