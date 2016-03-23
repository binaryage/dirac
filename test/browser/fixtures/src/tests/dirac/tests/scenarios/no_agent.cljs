(ns dirac.tests.scenarios.no-agent
  (:require [dirac.fixtures.devtools :refer [init-devtools!]]))

; deliberately misconfigure agent port to simulate "agent not listening on port" situation
(init-devtools! {:devtools-prefs {:agent-port 9999}})