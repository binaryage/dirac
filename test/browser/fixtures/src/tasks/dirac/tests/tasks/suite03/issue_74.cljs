(ns dirac.tests.tasks.suite03.issue-74
  (:require [cljs.core.async :refer [<! timeout]]
            [cljs.test :refer-macros [is are]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-console-feedback testing] :as a]))

(go-task
  (with-scenario "issue-74"
    (with-devtools
      (<!* a/switch-to-console-panel!)
      (<!* a/switch-prompt-to-dirac!)
      (<!* a/wait-for-prompt-to-enter-edit-mode)
      (with-console-feedback
        (<!* a/console-enter! "(require 'dirac.tests.scenarios.issue-74.core)")
        (<!* a/console-exec-and-match!
             "(in-ns 'dirac.tests.scenarios.issue-74.core)"
             "setDiracPromptNS('dirac.tests.scenarios.issue-74.core')")

        (testing "break on js-debugger, eval code in scope, resume"
          (<!* a/console-enter! "(fn-with-breakpoint)")
          (<!* a/wait-for-devtools-ui)                                                                                        ; give devtools UI some time to pause on the breakpoint
          (<!* a/focus-best-console-prompt!)
          (<!* a/console-exec-and-match!
               "(inc a)"
               "info> 43")
          (<!* a/simulate-global-action! "F8")                                                                                ; resume paused debugger
          (<!* a/wait-for-devtools-match "info> 84"))

        (testing "break on js-debugger, change var in scope, resume"
          (<!* a/console-enter! "(fn-with-breakpoint)")
          (<!* a/wait-for-devtools-ui)                                                                                        ; give devtools UI some time to pause on the breakpoint
          (<!* a/focus-best-console-prompt!)
          (<!* a/console-exec-and-match!
               "(set! js/a 30)"
               ["DF.warning> js/a is shadowed" "info> 30"])
          (<!* a/simulate-global-action! "F8")                                                                                ; resume paused debugger
          (<!* a/wait-for-devtools-match "info> 60"))

        (testing "break on js-debugger in async fn should not affect us"
          (<!* a/console-exec-and-match!
               "(fn-with-async-breakpoint)"
               "info> 100"))))))
