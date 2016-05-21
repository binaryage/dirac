(ns dirac.tests.tasks.suite01.dirac-eval
  (:require [cljs.core.async]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(def dirac-object "Object {automation: Object, tests: Object, runtime: Object, project: Object}")

(go-task
  (<!* a/open-tab-with-scenario! "normal")
  (<!* a/open-dirac-devtools!)
  (<!* a/switch-to-console!)
  (<!* a/switch-to-dirac-prompt!)
  (<!* a/wait-for-prompt-edit)
  (<!* a/enable-console-feedback!)
  ; ---
  (<!* a/console-exec-and-wait-for-match! "(+ 1 2)" "log> 3")
  (<!* a/console-exec-and-wait-for-match! "(range 200)" "log> (0 1 2 3 4 …)")
  (<!* a/console-exec-and-wait-for-match! "(doc filter)" "log> null")
  (<!* a/console-exec-and-wait-for-match! "js/dirac" (str "log> " dirac-object))
  (<!* a/console-exec-and-wait-for-match! "(x)" "err> TypeError: Cannot read property 'call' of undefined(…)")
  (<!* a/console-exec-and-wait-for-match! "(in-ns)" (str "java-trace > java.lang.IllegalArgumentException: "
                                                         "Argument to in-ns must be a symbol."))
  (<!* a/wait-for-devtools-substr-match "DF.log> java.lang.IllegalArgumentException: Argument to in-ns must be a symbol.")
  (<!* a/wait-for-devtools-substr-match "<elided stack trace log>")
  (<!* a/wait-for-devtools-substr-match "JS.log>")
  (<!* a/console-exec-and-wait-for-match! "(in-ns 'my.ns)" "setDiracPromptNS('my.ns')"))