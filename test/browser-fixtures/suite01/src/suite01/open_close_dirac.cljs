(ns suite01.open-close-dirac
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.fixtures :refer [go-test]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [dirac.fixtures :refer [setup! task-started! task-finished! wait-for-transcript-match
                                    SECOND MINUTE]]
            [dirac.automation :refer [wait-for-dirac-frontend-initialization wait-for-implant-initialization
                                      wait-for-console-initialization switch-inspector-panel!
                                      open-dirac-devtools! close-dirac-devtools!
                                      switch-to-dirac-prompt! switch-to-js-prompt!
                                      wait-switch-to-console]]))

(go-test
  (open-dirac-devtools!)
  (<! (wait-for-dirac-frontend-initialization))
  (<! (wait-for-implant-initialization))
  (close-dirac-devtools!))