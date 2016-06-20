(ns dirac.tests.tasks.suite01.completions
  (:require [cljs.core.async :refer [timeout]]
            [cljs.test :refer-macros [is are testing]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools chunkify] :as a]
            [clojure.string :as string]))

(go-task
  (with-scenario "completions"
    (with-devtools
      (chunkify
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (<! (timeout 1000))                                                                                                   ; wait for namespace cache to warm up
        (<!* a/enable-console-feedback!)
        (<!* a/console-exec-and-match!
             "(in-ns 'dirac.tests.scenarios.completions.workspace)"
             "setDiracPromptNS('dirac.tests.scenarios.completions.workspace')")
        (testing "in-ns completions for our namespace"
          (<!* a/simulate-console-input! "sample")
          (<!* a/scrape! :suggest-box))
        (testing "javascript completions in js/ namespace"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "js/docume")
          (<!* a/scrape! :suggest-box)
          (<!* a/simulate-console-action! "TAB")
          (is (= (<!* a/print-prompt!) "js/document"))
          (<!* a/simulate-console-input! ".get")
          (<!* a/scrape! :suggest-box)
          (<!* a/simulate-console-action! "TAB")
          (is (= (<!* a/print-prompt!) "js/document.getElementById")))
        (testing "qualified completions"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "cljs.core/part")
          (<!* a/scrape! :suggest-box)
          (<!* a/simulate-console-action! "TAB")
          (is (= (<!* a/print-prompt!) "cljs.core/partial")))
        (testing "namespace names completions"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "devtools.c")
          (<!* a/scrape! :suggest-box)
          (<!* a/simulate-console-action! "DOWN")
          (<!* a/simulate-console-action! "TAB")
          (is (= (<!* a/print-prompt!) "devtools.custom-formatters")))
        (testing "right-arrow completions"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "cljs.cor")
          (<!* a/scrape! :suggest-box)
          (<!* a/simulate-console-action! "RIGHT")
          (is (= (<!* a/print-prompt!) "cljs.core"))
          (<!* a/simulate-console-input! "/clj-")
          (<!* a/scrape! :suggest-box)
          (<!* a/simulate-console-action! "RIGHT")
          (is (= (<!* a/print-prompt!) "cljs.core/clj->js")))
        (testing "opening suggestion box"
          (<!* a/clear-console-prompt!)
          (is (nil? (<!* a/get-suggest-box-item-count)))
          (<!* a/simulate-console-action! "CTRL+SPACE")                                                                       ; https://github.com/binaryage/dirac/issues/22)
          (is (> (<!* a/get-suggest-box-item-count) 100)))
        (testing "aliases to namespaces and macro namespaces"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "alias")
          (<!* a/scrape! :suggest-box))
        (testing "refer namespace symbols"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "pu")
          (<!* a/scrape! :suggest-box))
        (testing "refer macro namespace symbols"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "wa")
          (<!* a/scrape! :suggest-box))
        (testing "refer macro namespace symbols coming from :refer-macros"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "get-dirac-window")
          (<!* a/scrape! :suggest-box))
        (testing "qualified completions of namespace alias"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "alias-cljs-core-async/tak")
          (<!* a/scrape! :suggest-box))
        (testing "qualified completions of macro namespace alias"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "alias-cljs-core-async-macros/go")
          (<!* a/scrape! :suggest-box))
        (testing "qualified completions of macro namespace"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "chromex.logging/lo")
          (<!* a/scrape! :suggest-box))
        (testing "closure libraries should be listed"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "goog.stri")
          (<!* a/scrape! :suggest-box))
        (testing "aliases to closure libraries should be listed"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "gstri")
          (<!* a/scrape! :suggest-box))
        (testing "qualified completions of closure libraries (full name)"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "goog.array/cl")
          (<!* a/scrape! :suggest-box))
        (testing "qualified completions of closure libraries (via alias)"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "gstring/case")
          (<!* a/scrape! :suggest-box))
        (testing "'dirac!' should be present as repl special command"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "dirac")
          (is (string/includes? (<!* a/scrape :suggest-box) "dirac|!")))
        (testing "'import' should be present as repl special command"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "impor")
          (is (string/includes? (<!* a/scrape :suggest-box) "impor|t")))
        (testing "'in-ns' should be present as repl special command"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "in-")
          (is (string/includes? (<!* a/scrape :suggest-box) "in-|ns")))
        (testing "'require' should be present as repl special command"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "requi")
          (is (string/includes? (<!* a/scrape :suggest-box) "requi|re")))
        (testing "*1 *2 *3 *e should be present as repl special commands"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "*")
          (let [output (<!* a/scrape :suggest-box)]
            (are [substr] (string/includes? output substr) "*|1" "*|2" "*|3" "*|e")))
        (testing "'load-file' and 'load-namespace' should be present as repl special commands"
          (<!* a/clear-console-prompt!)
          (<!* a/simulate-console-input! "load-")
          (let [output (<!* a/scrape :suggest-box)]
            (are [substr] (string/includes? output substr) "load-|file" "load-|namespace")))))))
