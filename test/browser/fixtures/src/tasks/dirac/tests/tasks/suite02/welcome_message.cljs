(ns dirac.tests.tasks.suite02.welcome-message
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.settings :refer [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]))

(go-task
  (with-scenario "normal"
    (testing "welcome message should be present by default"
      (with-devtools
        (<!* a/go-switch-to-console-panel!)
        (<!* a/go-wait-for-devtools-match "displayWelcomeMessage")))
    (testing "welcome message should not be present when disabled in options"
      (with-options {:welcome-message false}
        (with-devtools
          (<!* a/go-switch-to-console-panel!)
          (<!* a/go-wait-for-devtools-match "!dirac.hasWelcomeMessage"))))))
