(ns suite01.scenarios.no-agent
  (:require [dirac.fixtures.devtools :refer [init-devtools!]]))

(init-devtools! {:devtools-prefs {:agent-port 9999}})                                                                         ; deliberately misconfigure agent port