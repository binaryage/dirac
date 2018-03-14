(ns dirac.tests.tasks.suite03.issue-53
  (:require [cljs.core.async :refer [<! timeout]]
            [cljs.test :refer-macros [is are]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-console-feedback testing] :as a]))

(go-task
  (with-scenario "issue-53"
    (with-devtools
      (<!* a/switch-to-console-panel!)
      (<!* a/switch-prompt-to-dirac!)
      (<!* a/wait-for-prompt-to-enter-edit-mode)
      (with-console-feedback
        (<!* a/console-enter! "(require 'dirac.tests.scenarios.issue-53.core)")
        (<!* a/console-exec-and-match!
             "(in-ns 'dirac.tests.scenarios.issue-53.core)"
             "setDiracPromptNS('dirac.tests.scenarios.issue-53.core')")

        (testing "test case 1"
          (<!* a/console-enter! "(breakpoint-fn1)")
          (<!* a/wait-for-panel-switch "sources")
          (<!* a/scrape! :scope-content)
          (<!* a/simulate-global-action! "F8"))                                                                               ; resume paused debugger

        (testing "test case 2"
          (<!* a/switch-to-console-panel!)
          (<!* a/console-enter! "(breakpoint-fn2 1)")
          (<!* a/wait-for-panel-switch "sources")
          (<!* a/scrape! :scope-content)
          (<!* a/simulate-global-action! "F8"))                                                                               ; resume paused debugger
        ))))
