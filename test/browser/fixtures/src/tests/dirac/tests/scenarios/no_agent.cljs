(ns dirac.tests.scenarios.no-agent
  (:require [dirac.automation.runtime :refer [init-runtime!]]))

; deliberately misconfigure agent port to simulate "agent not listening on port" situation
(init-runtime! {:runtime-prefs {:agent-port 9999}})