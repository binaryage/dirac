(ns dirac.tests.tasks.suite03.issue-53
  (:require [dirac.shared.async :refer [<! go-wait]]
            [cljs.test :refer-macros [is are]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-console-feedback testing] :as a]))

(go-task
  (with-scenario "issue-53"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      (with-console-feedback
        (<!* a/go-type-in-console! "(require 'dirac.tests.scenarios.issue-53.core)")
        (<!* a/go-exec-and-match-in-console!
             "(in-ns 'dirac.tests.scenarios.issue-53.core)"
             "setDiracPromptNS('dirac.tests.scenarios.issue-53.core')")

        (testing "test case 1"
          (<!* a/go-type-in-console! "(breakpoint-fn1)")
          (<!* a/go-wait-for-panel-switch "sources")
          (<!* a/go-scrape! :scope-content)
          (<!* a/go-simulate-global-action! "F8"))                                                                            ; resume paused debugger

        (testing "test case 2"
          (<!* a/go-switch-to-console-panel!)
          (<!* a/go-type-in-console! "(breakpoint-fn2 1)")
          (<!* a/go-wait-for-panel-switch "sources")
          (<!* a/go-scrape! :scope-content)
          (<!* a/go-simulate-global-action! "F8"))                                                                            ; resume paused debugger
        ))))
