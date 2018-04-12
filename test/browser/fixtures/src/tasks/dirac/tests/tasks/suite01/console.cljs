(ns dirac.tests.tasks.suite01.console
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]))

(go-task
  (with-scenario "normal"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-enable-console-feedback!)
      (testing "keyboard shortcuts for switching between prompts"
        (<!* a/go-simulate-console-action! "CTRL+.")
        (<!* a/go-wait-for-prompt-switch-to-dirac)
        (<!* a/go-wait-for-prompt-to-enter-edit-mode)
        (<!* a/go-simulate-console-action! "CTRL+.")
        (<!* a/go-wait-for-prompt-switch-to-js)
        (<!* a/go-simulate-console-action! "CTRL+.")
        (<!* a/go-wait-for-prompt-switch-to-dirac)
        (<!* a/go-simulate-console-action! "CTRL+,")
        (<!* a/go-wait-for-prompt-switch-to-js)
        (<!* a/go-simulate-console-action! "CTRL+.")
        (<!* a/go-simulate-console-action! "CTRL+.")
        (<!* a/go-wait-for-prompt-switch-to-js)
        (<!* a/go-simulate-console-action! "CTRL+,")
        (<!* a/go-wait-for-prompt-switch-to-dirac))
      (testing "prompt input simulation and feedback"
        (<!* a/go-simulate-console-input! "hello!")
        (is (= (<!* a/go-print-prompt!) "hello!"))
        (<!* a/go-clear-console-prompt!)
        (is (= (<!* a/go-get-prompt-representation) ""))))))
