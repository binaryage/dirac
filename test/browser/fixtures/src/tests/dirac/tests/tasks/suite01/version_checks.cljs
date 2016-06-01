(ns dirac.tests.tasks.suite01.version-checks
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (let [scenario-id (<!* a/open-tab-with-scenario! "old-runtime")]
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Version mismatch: Dirac Runtime installed in the page has different version")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/close-devtools!)
    (<!* a/close-tab-with-scenario! scenario-id))
  (let [scenario-id (<!* a/open-tab-with-scenario! "future-runtime")]
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Version mismatch: Dirac Runtime installed in the page has different version")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/close-devtools!)
    (<!* a/close-tab-with-scenario! scenario-id)))