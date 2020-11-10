(ns dirac.tests.tasks.suite02.beautify-function-names
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-options with-scenario] :as a]
            [dirac.settings :refer [minutes seconds]]
            [dirac.shared.async :refer [<! go-wait]]
            [dirac.shared.utils :refer [line-count]]))

(go-task
  (with-scenario "breakpoint"
    (testing "enabled :beautify-function-names feature"
      (with-devtools
        (<!* a/go-wait-for-namespace-cache)
        (<!* a/go-trigger! :pause-on-breakpoint)
        (<!* a/go-wait-for-devtools-match "setCurrentPanel: sources")
        (<!* a/go-scrape! :callstack-pane-functions)
        (<!* a/go-wait-for-match "* breakpoint-demo / dirac.tests.scenarios.breakpoint.core/breakpoint-demo")
        (<!* a/go-wait-for-match "* λ")
        (<!* a/go-wait-for-match "* call-trigger! / dirac.automation.scenario/call-trigger!"))))
  (with-scenario "breakpoint"
    (testing "disabled :beautify-function-names feature"
      (with-options {:beautify-function-names false}
        (with-devtools
          (<!* a/go-wait-for-namespace-cache)
          (<!* a/go-trigger! :pause-on-breakpoint)
          (<!* a/go-wait-for-devtools-match "setCurrentPanel: sources")
          (<!* a/go-scrape! :callstack-pane-functions)
          (<!* a/go-wait-for-match "* dirac$tests$scenarios$breakpoint$core$breakpoint_demo")
          (<!* a/go-wait-for-match "* (anonymous)")
          (<!* a/go-wait-for-match "* dirac$automation$scenario$call_trigger_BANG_")))))
  (with-scenario "exception"
    (testing "trigger exception with non-trivial callstack"
      (with-devtools
        (<!* a/go-wait-for-namespace-cache)
        (<!* a/go-switch-to-console-panel!)
        (<!* a/go-trigger! :cause-exception)
        (<!* a/go-wait-for-match "uncaught exception: Error: :invalid is not ISeqable")
        (<!* a/go-wait-for-devtools-ui)
        (<!* a/go-scrape! :function-names-in-last-console-exception))))
  (with-scenario "core-async"
    (testing "core async stack traces"
      (with-devtools
        (<!* a/go-wait-for-namespace-cache)
        (<!* a/go-trigger! :async)
        (<!* a/go-wait-for-devtools-match "setCurrentPanel: sources")
        (<!* a/go-wait-for-devtools-ui)
        (<!* a/go-scrape! :callstack-pane-functions)
        (<!* a/go-wait-for-match "* break-here! / dirac.tests.scenarios.core-async/break-here!")))))
