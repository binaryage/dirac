(ns dirac.tests.tasks.suite01.open-close-dirac
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.automation.task :refer-macros [run-task]]
            [dirac.automation.constants :refer [SECOND MINUTE]]
            [dirac.automation :as auto]))

(run-task
  (auto/open-tab-with-scenario! "normal")
  (auto/open-dirac-devtools!)
  (auto/close-dirac-devtools! 1))