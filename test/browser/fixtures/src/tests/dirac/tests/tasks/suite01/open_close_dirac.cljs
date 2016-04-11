(ns dirac.tests.tasks.suite01.open-close-dirac
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.fixtures.task :refer-macros [run-task]]
            [dirac.fixtures.constants :refer [SECOND MINUTE]]
            [dirac.fixtures.automation :as auto]))

(run-task
  (auto/open-tab-with-scenario! "normal")
  (auto/open-dirac-devtools!)
  (auto/close-dirac-devtools! 1))