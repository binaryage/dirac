(ns dirac.tests.tasks.suite02.welcome-message
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-options with-scenario] :as a]
            [dirac.settings :refer [minutes seconds]]
            [dirac.shared.async]))

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
