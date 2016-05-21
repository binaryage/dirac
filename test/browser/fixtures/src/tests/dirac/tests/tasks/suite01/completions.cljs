(ns dirac.tests.tasks.suite01.completions
  (:require [cljs.core.async]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "completions")
  (<!* a/open-dirac-devtools!)
  (<!* a/switch-to-console!)
  (<!* a/switch-prompt-to-dirac!)
  (<!* a/wait-for-prompt-to-enter-edit-mode)
  (<!* a/enable-console-feedback!)
  ; ---
  ; test in-ns completions for our namespace
  (<!* a/clear-console-prompt!)
  (<!* a/console-exec-and-match!
       "(in-ns 'dirac.tests.scenarios.completions.workspace)"
       "setDiracPromptNS('dirac.tests.scenarios.completions.workspace')")
  (<!* a/add-input-to-console! "sample")
  (<!* a/print-suggest-box-state!)
  ; test javascript completions in js/ namespace
  (<!* a/clear-console-prompt!)
  (<!* a/add-input-to-console! "js/docume")
  (<!* a/print-suggest-box-state!)
  (<!* a/add-input-to-console! "nt.get")
  (<!* a/print-suggest-box-state!)
  ; test fully qualified complations
  (<!* a/clear-console-prompt!)
  (<!* a/add-input-to-console! "cljs.core/part")
  (<!* a/print-suggest-box-state!)
  ; test namespace completions
  (<!* a/clear-console-prompt!)
  (<!* a/add-input-to-console! "devtools.")
  (<!* a/print-suggest-box-state!))