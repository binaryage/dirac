(ns dirac.tests.tasks.suite01.completions
  (:require [cljs.core.async]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "completions")
  (<!* a/open-dirac-devtools!)
  (<!* a/switch-to-console!)
  (<!* a/switch-to-dirac-prompt!)
  (<!* a/wait-for-prompt-edit)
  (<!* a/enable-console-feedback!)
  ; ---
  ; test in-ns completions for our namespace
  (<!* a/clear-console-prompt!)
  (<!* a/console-exec-and-wait-for-match!
       "(in-ns 'dirac.tests.scenarios.completions.workspace)"
       "setDiracPromptNS('dirac.tests.scenarios.completions.workspace')")
  (<!* a/dispatch-console-prompt-input! "sample")
  (<!* a/print-suggest-box-representation)
  ; test javascript completions in js/ namespace
  (<!* a/clear-console-prompt!)
  (<!* a/dispatch-console-prompt-input! "js/docume")
  (<!* a/print-suggest-box-representation)
  (<!* a/dispatch-console-prompt-input! "nt.get")
  (<!* a/print-suggest-box-representation)
  ; test fully qualified complations
  (<!* a/clear-console-prompt!)
  (<!* a/dispatch-console-prompt-input! "cljs.core/part")
  (<!* a/print-suggest-box-representation)
  ; test namespace completions
  (<!* a/clear-console-prompt!)
  (<!* a/dispatch-console-prompt-input! "devtools.")
  (<!* a/print-suggest-box-representation))