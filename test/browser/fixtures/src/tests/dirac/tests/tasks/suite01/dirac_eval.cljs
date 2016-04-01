(ns dirac.tests.tasks.suite01.dirac-eval
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.fixtures.task :refer-macros [run-task]]
            [dirac.fixtures.constants :refer [SECOND MINUTE]]
            [dirac.fixtures.automation :as auto]))

(run-task
  (auto/open-tab-with-scenario! "normal")
  (auto/open-dirac-devtools!)
  (auto/wait-for-devtools)
  (auto/wait-switch-to-console 1)
  (auto/switch-to-dirac-prompt! 1)
  (<! (timeout (* 10 SECOND))))