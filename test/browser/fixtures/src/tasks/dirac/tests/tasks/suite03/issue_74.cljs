(ns dirac.tests.tasks.suite03.issue-74
  (:require [dirac.shared.async :refer [<! go-wait]]
            [cljs.test :refer-macros [is are]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-console-feedback testing] :as a]))

(go-task
  (with-scenario "issue-74"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      (with-console-feedback
        (<!* a/go-type-in-console! "(require 'dirac.tests.scenarios.issue-74.core)")
        (<!* a/go-exec-and-match-in-console!
             "(in-ns 'dirac.tests.scenarios.issue-74.core)"
             "setDiracPromptNS('dirac.tests.scenarios.issue-74.core')")

        (testing "break on js-debugger, eval code in scope, resume"
          (<!* a/go-type-in-console! "(fn-with-breakpoint)")
          (<!* a/go-wait-for-devtools-ui)                                                                                     ; give devtools UI some time to pause on the breakpoint
          (<!* a/go-focus-best-console-prompt!)
          (<!* a/go-exec-and-match-in-console!
               "(inc a)"
               "info> 43")
          (<!* a/go-simulate-global-action! "F8")                                                                             ; resume paused debugger
          (<!* a/go-wait-for-devtools-match "info> 84"))

        (testing "break on js-debugger, change var in scope, resume"
          (<!* a/go-type-in-console! "(fn-with-breakpoint)")
          (<!* a/go-wait-for-devtools-ui)                                                                                     ; give devtools UI some time to pause on the breakpoint
          (<!* a/go-focus-best-console-prompt!)
          (<!* a/go-exec-and-match-in-console!
               "(set! js/a 30)"
               ["DF.warning> js/a is shadowed" "info> 30"])
          (<!* a/go-simulate-global-action! "F8")                                                                             ; resume paused debugger
          (<!* a/go-wait-for-devtools-match "info> 60"))

        (testing "break on js-debugger in async fn should not affect us"
          (<!* a/go-exec-and-match-in-console!
               "(fn-with-async-breakpoint)"
               "info> 100"))))))
