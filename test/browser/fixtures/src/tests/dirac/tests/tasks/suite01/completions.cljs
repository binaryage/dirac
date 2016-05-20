(ns dirac.tests.tasks.suite01.completions
  (:require [cljs.core.async :refer [<! timeout]]
            [cljs.test :refer-macros [deftest testing is]]
            [dirac.automation :as auto :refer-macros [go-task with-devtools]]))

(go-task
  (<! (auto/open-tab-with-scenario! "completions"))
  (let [devtools-id (<! (auto/open-dirac-devtools!))]
    (<! (auto/switch-to-console-and-wait-for-it devtools-id))
    (<! (auto/switch-to-dirac-prompt! devtools-id))
    (<! (auto/wait-for-prompt-edit devtools-id))
    (<! (auto/enable-console-feedback! devtools-id))
    ; ---
    ; test in-ns completions for our namespace
    (auto/clear-console-prompt! devtools-id)
    (<! (auto/console-exec-and-wait-for-match! devtools-id "(in-ns 'dirac.tests.scenarios.completions.workspace)"
                                               "setDiracPromptNS('dirac.tests.scenarios.completions.workspace')"))
    (<! (auto/dispatch-console-prompt-input! devtools-id "sample"))
    (<! (auto/print-suggest-box-representation devtools-id))
    ; test javascript completions in js/ namespace
    (auto/clear-console-prompt! devtools-id)
    (<! (auto/dispatch-console-prompt-input! devtools-id "js/docume"))
    (<! (auto/print-suggest-box-representation devtools-id))
    (<! (auto/dispatch-console-prompt-input! devtools-id "nt.get"))
    (<! (auto/print-suggest-box-representation devtools-id))
    ; test fully qualified complations
    (auto/clear-console-prompt! devtools-id)
    (<! (auto/dispatch-console-prompt-input! devtools-id "cljs.core/part"))
    (<! (auto/print-suggest-box-representation devtools-id))
    ; test namespace completions
    (auto/clear-console-prompt! devtools-id)
    (<! (auto/dispatch-console-prompt-input! devtools-id "devtools."))
    (<! (auto/print-suggest-box-representation devtools-id))))