(ns dirac.tests.tasks.suite01.console
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options] :as a]))

(go-task
  (with-scenario "normal"
    (with-devtools
      (<!* a/switch-to-console-panel!)
      ; ---------------------------------------------------------------------------------------------------------------------
      (testing "welcome message should be present by default"
        (<!* a/wait-for-devtools-match "displayWelcomeMessage"))
      (<!* a/enable-console-feedback!)
      ; ---------------------------------------------------------------------------------------------------------------------
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
      ; ---------------------------------------------------------------------------------------------------------------------
      (testing "prompt input simulation and feedback"
        (<!* a/simulate-console-input! "hello!")
        (is (= (<!* a/print-prompt!) "hello!"))
        (<!* a/clear-console-prompt!)
        (is (= (<!* a/get-prompt-representation) ""))))
    ; -----------------------------------------------------------------------------------------------------------------------
    (testing "welcome message should not be present when disabled in options"
      (with-options {:welcome-message false}
        (with-devtools
          (<!* a/switch-to-console-panel!)
          (<!* a/wait-for-devtools-match "!dirac.hasWelcomeMessage"))))
    ; -----------------------------------------------------------------------------------------------------------------------
    (testing "parinfer should not be present when disabled in options"
      (with-options {:enable-parinfer false}
        (with-devtools
          (<!* a/switch-to-console-panel!)
          (<!* a/wait-for-devtools-match "use-parinfer? false"))))))