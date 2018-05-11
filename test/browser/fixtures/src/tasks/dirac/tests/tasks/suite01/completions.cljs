(ns dirac.tests.tasks.suite01.completions
  (:require [cljs.test :refer-macros [are is]]
            [clojure.string :as string]
            [dirac.automation :refer-macros [<!* chunkify go-task testing with-devtools with-scenario] :as a]
            [dirac.shared.async :refer [<! go-wait]]))

(go-task
  (with-scenario "completions"
    (with-devtools
      (chunkify
        (<!* a/go-switch-to-console-panel!)
        (<!* a/go-switch-prompt-to-dirac!)
        (<!* a/go-wait-for-prompt-to-enter-edit-mode)
        (<!* a/go-enable-console-feedback!)
        (<!* a/go-exec-and-match-in-console!
             "(in-ns 'dirac.tests.scenarios.completions.workspace)"
             "setDiracPromptNS('dirac.tests.scenarios.completions.workspace')")
        (testing "in-ns completions for our namespace"
          (<!* a/go-simulate-console-input! "sample")
          (<!* a/go-scrape! :suggest-box))
        (testing "javascript completions in js/ namespace"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "js/docume")
          (<!* a/go-scrape! :suggest-box)
          (<!* a/go-simulate-console-action! "TAB")
          (is (= (<!* a/go-print-prompt!) "js/document"))
          (<!* a/go-simulate-console-input! ".getElements")
          (<!* a/go-scrape! :suggest-box)
          (<!* a/go-simulate-console-action! "TAB")
          (is (= (<!* a/go-print-prompt!) "js/document.getElementsByClassName")))
        (testing "qualified completions"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "cljs.core/part")
          (<!* a/go-scrape! :suggest-box)
          (<!* a/go-simulate-console-action! "TAB")
          (is (= (<!* a/go-print-prompt!) "cljs.core/partial")))
        (testing "namespace names completions"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "cljs.r")
          (<!* a/go-scrape! :suggest-box)
          (<!* a/go-simulate-console-action! "DOWN")
          (<!* a/go-simulate-console-action! "TAB")
          (is (= (<!* a/go-print-prompt!) "cljs.repl")))
        (testing "right-arrow completions"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "cljs.cor")
          (<!* a/go-scrape! :suggest-box)
          (<!* a/go-simulate-console-action! "RIGHT")
          (is (= (<!* a/go-print-prompt!) "cljs.core"))
          (<!* a/go-simulate-console-input! "/clj-")
          (<!* a/go-scrape! :suggest-box)
          (<!* a/go-simulate-console-action! "RIGHT")
          (is (= (<!* a/go-print-prompt!) "cljs.core/clj->js")))
        (testing "opening suggestion box"
          (<!* a/go-clear-console-prompt!)
          (is (nil? (<!* a/go-get-suggest-box-item-count)))
          (<!* a/go-simulate-console-action! "CTRL+SPACE")                                                                    ; https://github.com/binaryage/dirac/issues/22)
          (is (> (<!* a/go-get-suggest-box-item-count) 100)))
        (testing "aliases to namespaces and macro namespaces"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "alias")
          (<!* a/go-scrape! :suggest-box))
        (testing "refer namespace symbols"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "pu")
          (<!* a/go-scrape! :suggest-box))
        (testing "refer macro namespace symbols"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "wa")
          (<!* a/go-scrape! :suggest-box))
        (testing "refer macro namespace symbols coming from :refer-macros"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "get-dirac-devtools-window")
          (<!* a/go-scrape! :suggest-box))
        (testing "qualified completions of namespace alias"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "alias-cljs-core-async/tak")
          (<!* a/go-scrape! :suggest-box))
        (testing "qualified completions of macro namespace alias"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "alias-cljs-core-async-macros/go")
          (<!* a/go-scrape! :suggest-box))
        (testing "qualified completions of macro namespace"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "chromex.logging/lo")
          (<!* a/go-scrape! :suggest-box))
        (testing "closure libraries should be listed"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "goog.stri")
          (<!* a/go-scrape! :suggest-box))
        (testing "aliases to closure libraries should be listed"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "gstri")
          (<!* a/go-scrape! :suggest-box))
        (testing "qualified completions of closure libraries (full name)"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "goog.array/cl")
          (<!* a/go-scrape! :suggest-box))
        (testing "qualified completions of closure libraries (via alias)"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "gstring/case")
          (<!* a/go-scrape! :suggest-box))
        (testing "'dirac!' should be present as repl special command"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "dirac")
          (is (string/includes? (<!* a/go-scrape :suggest-box) "dirac|!")))
        (testing "'load-file' should be present as repl special command"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "load-fi")
          (is (string/includes? (<!* a/go-scrape :suggest-box) "load-fi|le")))
        (testing "'in-ns' should be present as repl special command"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "in-")
          (is (string/includes? (<!* a/go-scrape :suggest-box) "in-|ns")))
        (testing "'load-namespace' should be present as repl special command"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "load-name")
          (is (string/includes? (<!* a/go-scrape :suggest-box) "load-name|space")))
        (testing "*1 *2 *3 *e should be present as repl special commands"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "*")
          (let [output (<!* a/go-scrape :suggest-box)]
            (are [substr] (string/includes? output substr) "*|1" "*|2" "*|3" "*|e")))
        (testing "'load-file' and 'load-namespace' should be present as repl special commands"
          (<!* a/go-clear-console-prompt!)
          (<!* a/go-simulate-console-input! "load-")
          (let [output (<!* a/go-scrape :suggest-box)]
            (are [substr] (string/includes? output substr) "load-|file" "load-|namespace")))))))
