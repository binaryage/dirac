(ns dirac.tests.tasks.suite02.enable-parinfer
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options] :as a]))

(go-task
  (with-scenario "normal"
    (testing "parinfer should be present by default"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/wait-for-devtools-match "use-parinfer? true")))
    (testing "parinfer should not be present when disabled in options"
      (with-options {:enable-parinfer false}
        (with-devtools
          (<!* a/switch-to-console-panel!)
          (<!* a/wait-for-devtools-match "use-parinfer? false"))))))