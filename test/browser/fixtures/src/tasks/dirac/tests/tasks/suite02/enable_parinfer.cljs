(ns dirac.tests.tasks.suite02.enable-parinfer
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.settings :refer [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]))

(go-task
  (with-scenario "normal"
    (testing "parinfer should be present by default"
      (with-devtools
        (<!* a/go-switch-to-console-panel!)
        (<!* a/go-wait-for-devtools-match "use-parinfer? true")))
    (testing "parinfer should not be present when disabled in options"
      (with-options {:enable-parinfer false}
        (with-devtools
          (<!* a/go-switch-to-console-panel!)
          (<!* a/go-wait-for-devtools-match "use-parinfer? false"))))))
