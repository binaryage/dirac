(ns dirac.tests.tasks.suite01.dirac-eval
  (:require [cljs.core.async :refer [<! timeout]]
            [dirac.automation :as auto :refer-macros [go-task with-devtools]]))

(def dirac-object "Object {automation: Object, tests: Object, runtime: Object, project: Object}")

(go-task
  (<! (auto/open-tab-with-scenario! "normal"))
  (with-devtools (<! (auto/open-dirac-devtools!))
    (auto/switch-to-console-and-wait-for-it)
    (auto/switch-to-dirac-prompt!)
    (auto/wait-for-prompt-edit)
    (auto/enable-console-feedback!)
    ; ---
    (auto/console-exec-and-wait-for-match! "(+ 1 2)" "log> 3")
    (auto/console-exec-and-wait-for-match! "(range 200)" "log> (0 1 2 3 4 …)")
    (auto/console-exec-and-wait-for-match! "(doc filter)" "log> null")
    (auto/console-exec-and-wait-for-match! "js/dirac" (str "log> " dirac-object))
    (auto/console-exec-and-wait-for-match! "(x)" "err> TypeError: Cannot read property 'call' of undefined(…)")
    (auto/console-exec-and-wait-for-match! "(in-ns)" (str "java-trace > java.lang.IllegalArgumentException: "
                                                          "Argument to in-ns must be a symbol."))
    (auto/wait-for-devtools-substr-match "DF.log> java.lang.IllegalArgumentException: Argument to in-ns must be a symbol.")
    (auto/wait-for-devtools-substr-match "<elided stack trace log>")
    (auto/wait-for-devtools-substr-match "JS.log>")
    (auto/console-exec-and-wait-for-match! "(in-ns 'my.ns)" "setDiracPromptNS('my.ns')")))