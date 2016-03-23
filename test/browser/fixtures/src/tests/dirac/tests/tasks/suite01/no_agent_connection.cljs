(ns dirac.tests.tasks.suite01.no-agent-connection
  (:require [dirac.fixtures.task :refer-macros [go-task]]
            [cljs.core.async :refer [<!]]
            [dirac.fixtures.constants :refer [SECOND MINUTE]]
            [dirac.fixtures.automation :refer [wait-for-dirac-frontend-initialization wait-for-implant-initialization
                                               wait-for-console-initialization switch-inspector-panel!
                                               open-dirac-devtools! close-dirac-devtools!
                                               switch-to-dirac-prompt! switch-to-js-prompt!
                                               wait-switch-to-console wait-for-transcript-match
                                               open-tab-with-scenario!]]))

(go-task
  (open-tab-with-scenario! "no-agent")
  (open-dirac-devtools!)
  (<! (wait-for-dirac-frontend-initialization))
  (<! (wait-for-implant-initialization))
  (<! (wait-switch-to-console 1))
  (switch-to-dirac-prompt! 1)
  (<! (wait-for-transcript-match #".*will try reconnect in 4 seconds.*" (* 20 SECOND))))