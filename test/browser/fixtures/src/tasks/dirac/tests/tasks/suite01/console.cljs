(ns dirac.tests.tasks.suite01.console
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]))

(go-task
  (with-scenario "normal"
    (with-devtools
      (<!* a/switch-to-console-panel!)
      (<!* a/enable-console-feedback!)
      (testing "keyboard shortcuts for switching between prompts"
        (<!* a/simulate-console-action! "CTRL+.")
        (<!* a/wait-for-prompt-switch-to-dirac)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (<!* a/simulate-console-action! "CTRL+.")
        (<!* a/wait-for-prompt-switch-to-js)
        (<!* a/simulate-console-action! "CTRL+.")
        (<!* a/wait-for-prompt-switch-to-dirac)
        (<!* a/simulate-console-action! "CTRL+,")
        (<!* a/wait-for-prompt-switch-to-js)
        (<!* a/simulate-console-action! "CTRL+.")
        (<!* a/simulate-console-action! "CTRL+.")
        (<!* a/wait-for-prompt-switch-to-js)
        (<!* a/simulate-console-action! "CTRL+,")
        (<!* a/wait-for-prompt-switch-to-dirac))
      (testing "prompt input simulation and feedback"
        (<!* a/simulate-console-input! "hello!")
        (is (= (<!* a/print-prompt!) "hello!"))
        (<!* a/clear-console-prompt!)
        (is (= (<!* a/get-prompt-representation) ""))))))
