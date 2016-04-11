(ns dirac.tests.tasks.suite01.no-agent-connection
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.automation.task :refer-macros [run-task]]
            [dirac.automation.constants :refer [SECOND MINUTE]]
            [dirac.automation :as auto]))

(run-task
  (auto/open-tab-with-scenario! "no-agent")
  (auto/open-dirac-devtools!)
  (auto/wait-switch-to-console 1)
  (auto/switch-to-dirac-prompt! 1)
  (auto/wait-for-transcript-match #".*will try reconnect in 4 seconds.*" (* 20 SECOND)))