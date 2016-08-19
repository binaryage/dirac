(ns dirac.tests.tasks.suite02.welcome-message
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options] :as a]))

(go-task
  (with-scenario "normal"
    (testing "welcome message should be present by default"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/wait-for-devtools-match "displayWelcomeMessage")))
    (testing "welcome message should not be present when disabled in options"
      (with-options {:welcome-message false}
        (with-devtools
          (<!* a/switch-to-console-panel!)
          (<!* a/wait-for-devtools-match "!dirac.hasWelcomeMessage"))))))
