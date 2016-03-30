(ns dirac.tests.tasks.suite01.open-close-dirac
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.fixtures.task :refer-macros [go-task]]
            [dirac.fixtures.constants :refer [SECOND MINUTE]]
            [dirac.fixtures.automation :refer [wait-for-dirac-frontend-initialization wait-for-implant-initialization
                                               wait-for-console-initialization switch-inspector-panel!
                                               open-dirac-devtools! close-dirac-devtools!
                                               switch-to-dirac-prompt! switch-to-js-prompt!
                                               wait-switch-to-console
                                               open-tab-with-scenario!]]))

(go-task
  (open-tab-with-scenario! "normal")
  (open-dirac-devtools!)
  (wait-for-dirac-frontend-initialization)
  (wait-for-implant-initialization)
  (close-dirac-devtools! 1))