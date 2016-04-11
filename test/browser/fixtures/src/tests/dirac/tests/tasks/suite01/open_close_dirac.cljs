(ns dirac.tests.tasks.suite01.open-close-dirac
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.automation :as auto :refer-macros [run-task]]))

(run-task
  (auto/open-tab-with-scenario! "normal")
  (auto/open-dirac-devtools!)
  (auto/close-dirac-devtools! 1))