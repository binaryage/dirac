(ns dirac.tests.tasks.suite03.issue-55
  (:require [cljs.test :refer-macros [are is]]
            [dirac.automation :refer-macros [<!* chunkify go-task testing with-devtools with-scenario] :as a]
            [dirac.shared.async :refer [<! go-wait]]))

(go-task
  (with-scenario "issue-55"
    (with-devtools
      (testing "there should be no internal errors due to reader conditionals in cljc files (issue 55)"
        (<!* a/go-switch-to-console-panel!)
        (<!* a/go-switch-prompt-to-dirac!)
        (<!* a/go-wait-for-prompt-to-enter-edit-mode)
        (<!* a/go-reload!)
        (<!* a/go-wait-for-prompt-to-enter-edit-mode)
        (is (zero? (<!* a/go-count-internal-dirac-errors)))))))
