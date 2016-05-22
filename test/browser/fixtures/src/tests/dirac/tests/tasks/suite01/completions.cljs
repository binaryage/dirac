(ns dirac.tests.tasks.suite01.completions
  (:require [cljs.core.async]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "completions")
  (<!* a/open-devtools!)
  (<!* a/switch-to-console-panel!)
  (<!* a/switch-prompt-to-dirac!)
  (<!* a/wait-for-prompt-to-enter-edit-mode)
  (<!* a/enable-console-feedback!)
  ; -- test in-ns completions for our namespace -----------------------------------------------------------------------------
  (<!* a/console-exec-and-match!
       "(in-ns 'dirac.tests.scenarios.completions.workspace)"
       "setDiracPromptNS('dirac.tests.scenarios.completions.workspace')")
  (<!* a/simulate-console-input! "sample")
  (<!* a/print-suggest-box-state!)
  ; -- test javascript completions in js/ namespace -------------------------------------------------------------------------
  (<!* a/clear-console-prompt!)
  (<!* a/simulate-console-input! "js/docume")
  (<!* a/print-suggest-box-state!)
  (<!* a/simulate-console-action! "TAB")
  (<!* a/print-prompt-state!)
  (<!* a/simulate-console-input! ".get")
  (<!* a/print-suggest-box-state!)
  (<!* a/simulate-console-action! "TAB")
  (<!* a/print-prompt-state!)
  ; -- test fully qualified completions -------------------------------------------------------------------------------------
  (<!* a/clear-console-prompt!)
  (<!* a/simulate-console-input! "cljs.core/part")
  (<!* a/print-suggest-box-state!)
  (<!* a/simulate-console-action! "TAB")
  (<!* a/print-prompt-state!)
  ; -- test namespace names completions -------------------------------------------------------------------------------------
  (<!* a/clear-console-prompt!)
  (<!* a/simulate-console-input! "devtools.")
  (<!* a/print-suggest-box-state!)
  (<!* a/simulate-console-action! "DOWN")
  (<!* a/simulate-console-action! "TAB")
  (<!* a/print-prompt-state!)
  ; -- test right-arrow completions -----------------------------------------------------------------------------------------
  (<!* a/clear-console-prompt!)
  (<!* a/simulate-console-input! "cljs.cor")
  (<!* a/print-suggest-box-state!)
  (<!* a/simulate-console-action! "RIGHT")
  (<!* a/print-prompt-state!)
  (<!* a/simulate-console-input! "/clj-")
  (<!* a/print-suggest-box-state!)
  (<!* a/simulate-console-action! "RIGHT")
  (<!* a/print-prompt-state!))