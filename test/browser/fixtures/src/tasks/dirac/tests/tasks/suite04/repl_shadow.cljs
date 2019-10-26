(ns dirac.tests.tasks.suite04.repl-shadow
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* chunkify go-task testing with-console-feedback with-devtools
                                             with-scenario] :as a]
            [dirac.settings :refer [minutes seconds]]
            [dirac.shared.async :refer [<! go-wait]]))

(go-task
  (with-scenario "repl shadow"
    (chunkify
      (testing "simple REPL eval interactions"
        (with-devtools
          (<!* a/go-switch-to-console-panel!)
          (<!* a/go-switch-prompt-to-dirac!)
          (<!* a/go-wait-for-prompt-to-enter-edit-mode)
          (with-console-feedback
            #_(chunkify
              (<!* a/go-exec-and-match-in-console! "(+ 1 2)" "info> 3")
              (<!* a/go-exec-and-match-in-console! "4 5 6" ["info> 4" "info> 5" "info> 6"])                                   ; more forms are evaluated one by one

              ; an edge case
              (<!* a/go-focus-console-prompt!)
              (<!* a/go-simulate-console-action! "SHIFT+ENTER")
              (<!* a/go-simulate-console-input! "7")
              (<!* a/go-simulate-console-action! "ENTER")
              (<!* a/go-wait-for-repl-job-match-in-console! "info> 7")

              ; https://github.com/binaryage/dirac/issues/72
              (<!* a/go-focus-console-prompt!)
              (<!* a/go-simulate-console-input! "(let [x 1")
              (<!* a/go-simulate-console-action! "SHIFT+ENTER")
              (<!* a/go-simulate-console-input! "y 2")
              (is (= (<!* a/go-get-prompt-representation) "(let [x 1\n      y 2])")))

            (<!* a/go-exec-and-match-in-console! "(range 200)" "info> (0 1 2 3 4 …)")
            (<!* a/go-exec-and-match-in-console! "(doc filter)" "info> null")
            (<!* a/go-exec-and-match-in-console! "js/window.NaN" "info> NaN")
            ; TODO: revisit this, seems to be flaky
            ;(<!* a/go-exec-and-match-in-console! "(x)" "TypeError: Cannot read property 'call' of undefined")
            ;(<!* a/go-exec-and-match-in-console! "(in-ns)" (str "java-trace/plain-text > java.lang.IllegalArgumentException: "
            ;                                                    "Argument to in-ns must be a symbol."))
            ;(<!* a/go-wait-for-devtools-match "<elided stack trace>")
            ;(<!* a/go-wait-for-devtools-match #"^JS.info")
            ;(<!* a/go-exec-and-match-in-console! "(in-ns 'my.ns)" "setDiracPromptNS('my.ns')")
            )))
      ;(testing "page-initiated eval requests, https://github.com/binaryage/dirac/issues/38"
      ;  (with-devtools
      ;    (<!* a/go-switch-to-console-panel!)
      ;    (<!* a/go-switch-prompt-to-dirac!)
      ;    (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      ;    (with-console-feedback
      ;      (<!* a/go-trigger! :eval-js "console.log('js code here'); 1+3")
      ;      (<!* a/go-wait-for-devtools-match "js code here")
      ;      (<!* a/go-wait-for-devtools-match "JS.info> 4")
      ;      (<!* a/go-trigger! :eval-cljs "(+ 2 40)")
      ;      (<!* a/go-wait-for-devtools-match "DF.info> 42")
      ;      (<!* a/go-wait-for-devtools-match "repl eval job ended"))))
      ;(testing "page refresh while REPL was connected"
      ;  (with-devtools
      ;    (<!* a/go-switch-to-console-panel!)
      ;    (<!* a/go-switch-prompt-to-dirac!)
      ;    (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      ;    (with-console-feedback
      ;      (<!* a/go-exec-and-match-in-console! "(+ 1 2)" "info> 3"))
      ;    (<!* a/go-reload!)
      ;    (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      ;    (with-console-feedback
      ;      (<!* a/go-exec-and-match-in-console! "(+ 1 2)" "info> 3"))
      ;    (<!* a/go-reload!)
      ;    (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      ;    (with-console-feedback
      ;      (<!* a/go-exec-and-match-in-console! "(+ 1 2)" "info> 3"))))
      ;(testing "navigate to a new page without dirac runtime while REPL was connected, then navigate back and exercise REPL"
      ;  (with-devtools
      ;    (<!* a/go-switch-to-console-panel!)
      ;    (<!* a/go-switch-prompt-to-dirac!)
      ;    (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      ;    (with-console-feedback
      ;      (<!* a/go-exec-and-match-in-console! "(+ 1 2)" "info> 3"))
      ;    (<!* a/go-trigger! :navigate "/scenarios/no-runtime.html")
      ;    ; error should be presented to the user
      ;    (<!* a/go-wait-for-devtools-match "Dirac requires runtime support from your app" (seconds 20))
      ;    (<!* a/go-wait-for-devtools-match "setDiracPromptStatusStyle('error')")
      ;    (<!* a/go-trigger! :navigate "/scenarios/repl.html")
      ;    ; now we should auto-reconnect because we were still switched to dirac prompt
      ;    (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      ;    (with-console-feedback
      ;      (<!* a/go-exec-and-match-in-console! "(+ 1 2)" "info> 3"))))
      ;(testing "page refresh while REPL was connected (but not active)"
      ;  (with-devtools
      ;    (<!* a/go-switch-to-console-panel!)
      ;    (<!* a/go-switch-prompt-to-dirac!)
      ;    (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      ;    (<!* a/go-switch-prompt-to-javascript!)
      ;    (<!* a/go-reload!)
      ;    ; after reload we should not reconnect in background because we were switched to javascript prompt
      ;    (<!* a/go-wait-for-devtools-match "Disconnected")
      ;    (<!* a/go-switch-prompt-to-dirac!)
      ;    (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      ;    (with-console-feedback
      ;      (<!* a/go-exec-and-match-in-console! "(+ 1 2)" "info> 3"))))
      ;(testing "page refresh while REPL was not connected"
      ;  (with-devtools
      ;    (<!* a/go-switch-to-console-panel!)
      ;    (<!* a/go-reload!)
      ;    (<!* a/go-reload!)))
      ;(testing "make sure `in-ns` works (https://github.com/binaryage/dirac/issues/47)"
      ;  (with-devtools
      ;    (<!* a/go-switch-to-console-panel!)
      ;    (<!* a/go-switch-prompt-to-dirac!)
      ;    (<!* a/go-wait-for-prompt-to-enter-edit-mode)
      ;    (with-console-feedback
      ;      (<!* a/go-type-in-console! "(require 'dirac.tests.scenarios.repl.workspace)")
      ;      (<!* a/go-exec-and-match-in-console!
      ;           "(in-ns 'dirac.tests.scenarios.repl.workspace)"
      ;           "setDiracPromptNS('dirac.tests.scenarios.repl.workspace')")
      ;      (is (= (<!* a/go-scrape :dirac-prompt-placeholder) "dirac.tests.scenarios.repl.workspace"))
      ;      (<!* a/go-exec-and-match-in-console! "(hello! \"REPL\")" ["DF.info> Hello, REPL!" "DF.info> null"])
      ;      (is (= (<!* a/go-scrape :dirac-prompt-placeholder) "dirac.tests.scenarios.repl.workspace"))
      ;      (<!* a/go-exec-and-match-in-console! "(hello! \"again\")" ["DF.info> Hello, again!" "DF.info> null"])
      ;      (<!* a/go-exec-and-match-in-console!
      ;           "(in-ns 'cljs.user)"
      ;           "setDiracPromptNS('cljs.user')")
      ;      (is (= (<!* a/go-scrape :dirac-prompt-placeholder) "cljs.user")))))
      )))
