(ns dirac.tests.tasks.suite01.no-agent
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-scenario] :as a]
            [dirac.settings :refer [minutes seconds]]
            [dirac.shared.async]))

(go-task
  (with-scenario "no-agent"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-devtools-match "will <a>try to reconnect</a> in 4 seconds" (seconds 20)))))
