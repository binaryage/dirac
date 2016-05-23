(ns dirac.tests.tasks.suite01.no-agent-connection
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "no-agent")
  (<!* a/open-devtools!)
  (<!* a/switch-to-console-panel!)
  (<!* a/switch-prompt-to-dirac!)
  (<!* a/wait-for-devtools-match "will try reconnect in 4 seconds" (seconds 20)))