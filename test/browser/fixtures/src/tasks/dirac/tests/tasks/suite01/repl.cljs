(ns dirac.tests.tasks.suite01.repl
  (:require [cljs.core.async :refer [timeout]]
            [dirac.settings :refer-macros [seconds minutes]]
            [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools testing with-console-feedback] :as a]))

(go-task
  (with-scenario "normal"
    (testing "simple REPL eval interactions"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "log> 3")
          (<!* a/console-exec-and-match! "(range 200)" "log> (0 1 2 3 4 …)")
          (<!* a/console-exec-and-match! "(doc filter)" "log> null")
          (<!* a/console-exec-and-match! "js/window.NaN" "log> NaN")
          (<!* a/console-exec-and-match! "(x)" "TypeError: Cannot read property 'call' of undefined")
          (<!* a/console-exec-and-match! "(in-ns)" (str "java-trace > java.lang.IllegalArgumentException: "
                                                        "Argument to in-ns must be a symbol."))
          (<!* a/wait-for-devtools-match "<elided stack trace log>")
          (<!* a/wait-for-devtools-match #"^JS.log")
          (<!* a/console-exec-and-match! "(in-ns 'my.ns)" "setDiracPromptNS('my.ns')"))))
    (testing "page refresh while REPL was connected"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "log> 3"))
        (<!* a/trigger! :reload)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "log> 3"))
        (<!* a/trigger! :reload)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "log> 3"))))
    (testing "navigate to a new page without dirac runtime while REPL was connected, then navigate back and exercise REPL"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "log> 3"))
        (<!* a/trigger! :navigate "/scenarios/no-runtime.html")
        ; error should be presented to the user
        (<!* a/wait-for-devtools-match "Dirac requires runtime support from your app" (seconds 20))
        (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')")
        (<!* a/trigger! :navigate "/scenarios/normal.html")
        ; now we should auto-recoonect because we were still switched to dirac prompt
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "log> 3"))))
    (testing "page refresh while REPL was connected (but not active)"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (<!* a/switch-prompt-to-javascript!)
        (<!* a/trigger! :reload)
        ; after reload we should not reconnect in background because we were switched to javascript prompt
        (<!* a/wait-for-devtools-match "Disconnected")
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "log> 3"))))
    (testing "page refresh while REPL was not connected"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/trigger! :reload)
        (<! (timeout 3000))
        (<!* a/trigger! :reload)
        (<! (timeout 3000))))))
