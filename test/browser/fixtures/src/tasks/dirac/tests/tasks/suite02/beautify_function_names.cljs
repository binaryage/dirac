(ns dirac.tests.tasks.suite02.beautify-function-names
  (:require [cljs.core.async :refer [<! chan timeout]]
            [cljs.test :refer-macros [is]]
            [dirac.utils :refer [line-count]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]))

(go-task
  (with-scenario "breakpoint"
    (testing "enabled :beautify-function-names feature"
      (with-devtools
        (<!* a/trigger! :pause-on-breakpoint)
        (<!* a/wait-for-devtools-match "setCurrentPanel: sources")
        (is (= (line-count (<!* a/scrape! :callstack-pane-functions)) 10))
        (<!* a/wait-for-match "* breakpoint-demo / dirac.tests.scenarios.breakpoint.core/breakpoint-demo")
        (<!* a/wait-for-match "* (anonymous function)")
        (<!* a/wait-for-match "* call-trigger! / dirac.automation.scenario/call-trigger!"))))
  (with-scenario "breakpoint"
    (testing "disabled :beautify-function-names feature"
      (with-options {:beautify-function-names false}
        (with-devtools
          (<!* a/trigger! :pause-on-breakpoint)
          (<!* a/wait-for-devtools-match "setCurrentPanel: sources")
          (is (= (line-count (<!* a/scrape! :callstack-pane-functions)) 10))
          (<!* a/wait-for-match "* dirac$tests$scenarios$breakpoint$core$breakpoint_demo")
          (<!* a/wait-for-match "* (anonymous function)")
          (<!* a/wait-for-match "* dirac$automation$scenario$call_trigger_BANG_")))))
  (with-scenario "exception"
    (testing "trigger exception with non-trivial callstack"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/trigger! :cause-exception)
        (<!* a/wait-for-match "uncaught exception: Error: :invalid is not ISeqable")
        (<! (timeout 200))                                                                                                    ; we have to give the renderer some time to present it in the dom
        (is (= (line-count (<!* a/scrape! :function-names-in-last-console-exception)) 31)))))
  (with-scenario "core-async"
    (testing "core async stack traces"
      (with-devtools
        (<!* a/trigger! :async)
        (<!* a/wait-for-devtools-match "setCurrentPanel: sources")
        (<! (timeout 200))
        (is (= (line-count (<!* a/scrape! :callstack-pane-functions)) 11))
        (<!* a/wait-for-match "* break-here! / dirac.tests.scenarios.core-async/break-here!")))))
