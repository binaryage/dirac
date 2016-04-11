(ns dirac.tests.tasks.suite01.no-agent-connection
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.fixtures.task :refer-macros [run-task]]
            [dirac.fixtures.constants :refer [SECOND MINUTE]]
            [dirac.fixtures.automation :as auto]))

(run-task
  (auto/open-tab-with-scenario! "no-agent")
  (auto/open-dirac-devtools!)
  (auto/wait-switch-to-console 1)
  (auto/switch-to-dirac-prompt! 1)
  (auto/wait-for-transcript-match #".*will try reconnect in 4 seconds.*" (* 20 SECOND)))