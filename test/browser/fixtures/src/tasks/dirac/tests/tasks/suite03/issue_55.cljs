(ns dirac.tests.tasks.suite03.issue-55
  (:require [cljs.core.async :refer [<! timeout]]
            [cljs.test :refer-macros [is are]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools chunkify testing] :as a]))

(go-task
  (with-scenario "issue-55"
    (with-devtools
      (testing "there should be no internal errors due to reader conditionals in cljc files (issue 55)"
        (<!* a/switch-to-console-panel!)
        (<!* a/switch-prompt-to-dirac!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (<!* a/reload!)
        (<!* a/wait-for-prompt-to-enter-edit-mode)
        (is (zero? (<!* a/count-internal-dirac-errors)))))))
