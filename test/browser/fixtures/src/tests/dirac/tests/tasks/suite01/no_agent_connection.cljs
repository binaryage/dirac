(ns dirac.tests.tasks.suite01.no-agent-connection
  (:require [cljs.core.async]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "no-agent")
  (<!* a/open-dirac-devtools!)
  (<!* a/switch-to-console!)
  (<!* a/switch-to-dirac-prompt!)
  (<!* a/wait-for-devtools-substr-match "will try reconnect in 4 seconds" (seconds 20)))