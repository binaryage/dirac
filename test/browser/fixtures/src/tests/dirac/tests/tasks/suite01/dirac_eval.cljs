(ns dirac.tests.tasks.suite01.dirac-eval
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.automation.task :refer-macros [run-task]]
            [dirac.automation :as auto]))

(run-task
  (auto/open-tab-with-scenario! "normal")
  (auto/open-dirac-devtools!)
  ; ---
  (auto/wait-switch-to-console 1)
  (auto/switch-to-dirac-prompt! 1)
  (auto/wait-for-prompt-edit)
  (auto/enable-console-feedback! 1)
  (auto/dispatch-console-prompt-input! 1 "(+ 1 2)")
  (auto/dispatch-console-prompt-action! 1 "enter")
  ; ---
  (auto/wait-for-transcript-match #".*> 3.*"))