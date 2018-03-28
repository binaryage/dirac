(ns dirac.tests.tasks.suite01.no-agent
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.settings :refer [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools testing] :as a]))

(go-task
  (with-scenario "no-agent"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-devtools-match "will <a>try to reconnect</a> in 4 seconds" (seconds 20)))))
