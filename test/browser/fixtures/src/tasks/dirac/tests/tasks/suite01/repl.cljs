(ns dirac.tests.tasks.suite01.repl
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.settings :refer-macros [seconds minutes]]
            [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools testing with-console-feedback
                                             chunkify] :as a]))

(go-task
  (with-scenario "repl"
    (testing "simple REPL eval interactions"
      (with-devtools
        (chunkify
          (<!* a/switch-to-console-panel!)
          (<!* a/switch-prompt-to-dirac!)
          (<!* a/wait-for-prompt-to-enter-edit-mode)
          (with-console-feedback
            (<!* a/console-exec-and-match! "(+ 1 2)" "info> 3")
            (<!* a/console-exec-and-match! "4 5 6" ["info> 4" "info> 5" "info> 6"])                                           ; more forms are evaluated one by one

            ; an edge case
            (<!* a/focus-console-prompt!)
            (<!* a/simulate-console-action! "SHIFT+ENTER")
            (<!* a/simulate-console-input! "7")
            (<!* a/simulate-console-action! "ENTER")
            (<!* a/console-wait-for-repl-job-match! "info> 7")

            (<!* a/console-exec-and-match! "(range 200)" "info> (0 1 2 3 4 …)")
            (<!* a/console-exec-and-match! "(doc filter)" "info> null")
            (<!* a/console-exec-and-match! "js/window.NaN" "info> NaN")
            ; TODO: revisit this, seems to be flaky
            #_(<!* a/console-exec-and-match! "(x)" "TypeError: Cannot read property 'call' of undefined")
            (<!* a/console-exec-and-match! "(in-ns)" (str "java-trace/plain-text > java.lang.IllegalArgumentException: "
                                                          "Argument to in-ns must be a symbol."))
            (<!* a/wait-for-devtools-match "<elided stack trace>")
            (<!* a/wait-for-devtools-match #"^JS.info")
            (<!* a/console-exec-and-match! "(in-ns 'my.ns)" "setDiracPromptNS('my.ns')")))))
    (testing "page-initiated eval requests, https://github.com/binaryage/dirac/issues/38"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/trigger! :eval-js "console.log('js code here'); 1+3")
          (<!* a/wait-for-devtools-match "js code here")
          (<!* a/wait-for-devtools-match "JS.info> 4")
          (<!* a/trigger! :eval-cljs "(+ 2 40)")
          (<!* a/wait-for-devtools-match "DF.info> 42")
          (<!* a/wait-for-devtools-match "repl eval job ended"))))
    (testing "page refresh while REPL was connected"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "info> 3"))
        (<!* a/trigger! :reload)
        (<! (timeout 3000))
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "info> 3"))
        (<!* a/trigger! :reload)
        (<! (timeout 3000))
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "info> 3"))))
    (testing "navigate to a new page without dirac runtime while REPL was connected, then navigate back and exercise REPL"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "info> 3"))
        (<!* a/trigger! :navigate "/scenarios/no-runtime.html")
        ; error should be presented to the user
        (<!* a/wait-for-devtools-match "Dirac requires runtime support from your app" (seconds 20))
        (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')")
        (<!* a/trigger! :navigate "/scenarios/repl.html")
        ; now we should auto-recoonect because we were still switched to dirac prompt
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "info> 3"))))
    (testing "page refresh while REPL was connected (but not active)"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (<!* a/switch-prompt-to-javascript!)
        (<!* a/trigger! :reload)
        (<! (timeout 3000))
        ; after reload we should not reconnect in background because we were switched to javascript prompt
        (<!* a/wait-for-devtools-match "Disconnected")
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-exec-and-match! "(+ 1 2)" "info> 3"))))
    (testing "page refresh while REPL was not connected"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/trigger! :reload)
        (<! (timeout 3000))
        (<!* a/trigger! :reload)
        (<! (timeout 3000))))
    (testing "make sure `in-ns` works (https://github.com/binaryage/dirac/issues/47)"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (with-console-feedback
          (<!* a/console-enter! "(require 'dirac.tests.scenarios.repl.workspace)")
          (<!* a/console-exec-and-match!
               "(in-ns 'dirac.tests.scenarios.repl.workspace)"
               "setDiracPromptNS('dirac.tests.scenarios.repl.workspace')")
          (is (= (<!* a/scrape :dirac-prompt-placeholder) "dirac.tests.scenarios.repl.workspace"))
          (<!* a/console-exec-and-match! "(hello! \"REPL\")" ["DF.info> Hello, REPL!" "DF.info> null"])
          (is (= (<!* a/scrape :dirac-prompt-placeholder) "dirac.tests.scenarios.repl.workspace"))
          (<!* a/console-exec-and-match! "(hello! \"again\")" ["DF.info> Hello, again!" "DF.info> null"])
          (<!* a/console-exec-and-match!
               "(in-ns 'cljs.user)"
               "setDiracPromptNS('cljs.user')")
          (is (= (<!* a/scrape :dirac-prompt-placeholder) "cljs.user")))))))
