(ns dirac.tests.tasks.suite01.no-agent-connection
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :as auto :refer-macros [go-task with-devtools]]))

(go-task
  (<! (auto/open-tab-with-scenario! "no-agent"))
  (with-devtools (<! (auto/open-dirac-devtools!))
    (auto/wait-switch-to-console)
    (auto/switch-to-dirac-prompt!)
    (auto/wait-for-devtools-substr-match "will try reconnect in 4 seconds" (seconds 20))))