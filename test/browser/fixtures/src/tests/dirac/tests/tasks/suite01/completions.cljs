(ns dirac.tests.tasks.suite01.completions
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.automation :as auto :refer-macros [go-task with-devtools]]))

(go-task
  (<! (auto/open-tab-with-scenario! "completions"))
  (with-devtools (<! (auto/open-dirac-devtools!))
    (auto/switch-to-console-and-wait-for-it)
    (auto/switch-to-dirac-prompt!)
    (auto/wait-for-prompt-edit)
    (auto/enable-console-feedback!)
    ; ---
    (auto/console-exec-and-wait-for-match! "(in-ns 'dirac.tests.scenarios.completions.workspace)"
                                           "setDiracPromptNS('dirac.tests.scenarios.completions.workspace')")
    (auto/dispatch-console-prompt-input! "sample")
    (auto/dispatch-console-prompt-action! "backspace")))