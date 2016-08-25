(ns dirac.tests.tasks.suite01.no-agent
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools testing] :as a]))

(go-task
  (with-scenario "no-agent"
    (with-devtools
      (<!* a/switch-to-console-panel!)
      (<!* a/switch-prompt-to-dirac!)
      (<!* a/wait-for-devtools-match "will <a>try to reconnect</a> in 4 seconds" (seconds 20)))))
