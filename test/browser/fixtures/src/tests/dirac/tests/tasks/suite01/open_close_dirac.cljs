(ns dirac.tests.tasks.suite01.open-close-dirac
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.automation :as auto :refer-macros [go-task doto-devtools]]))

(go-task
  (<! (auto/open-tab-with-scenario! "normal"))
  (doto-devtools (<! (auto/open-dirac-devtools!))
    (auto/close-dirac-devtools!)
    (auto/wait-for-devtools-close)))