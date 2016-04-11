(ns dirac.tests.tasks.suite01.dirac-eval
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.automation :as auto :refer-macros [go-task doto-devtools]]))

(go-task
  (<! (auto/open-tab-with-scenario! "normal"))
  (doto-devtools (<! (auto/open-dirac-devtools!))
    (auto/wait-switch-to-console)
    (auto/switch-to-dirac-prompt!)
    (auto/wait-for-prompt-edit)
    (auto/enable-console-feedback!)
    (auto/dispatch-console-prompt-input! "(+ 1 2)")
    (auto/dispatch-console-prompt-action! "enter")
    (auto/wait-for-devtools-substr-match "> 3")))