(ns dirac.tests.tasks.suite01.version-checks
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (let [scenario-id (<!* a/open-tab-with-scenario! "old-runtime")]
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Version mismatch: Dirac Runtime installed in the page has different version")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-prompt-to-enter-edit-mode)
    (<!* a/close-devtools!)
    (<!* a/close-tab-with-scenario! scenario-id))
  (let [scenario-id (<!* a/open-tab-with-scenario! "future-runtime")]
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Version mismatch: Dirac Runtime installed in the page has different version")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-prompt-to-enter-edit-mode)
    (<!* a/close-devtools!)
    (<!* a/close-tab-with-scenario! scenario-id))
  (let [scenario-id (<!* a/open-tab-with-scenario! "old-repl-api")]
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Dirac REPL API version mismatch detected.")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')")
    (<!* a/close-devtools!)
    (<!* a/close-tab-with-scenario! scenario-id))
  (let [scenario-id (<!* a/open-tab-with-scenario! "future-repl-api")]
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Dirac REPL API version mismatch detected.")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')")
    (<!* a/close-devtools!)
    (<!* a/close-tab-with-scenario! scenario-id))
  (let [scenario-id (<!* a/open-tab-with-scenario! "no-runtime")]
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Dirac requires runtime support from the page context" (seconds 20))
    (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')" (seconds 20))
    (<!* a/close-devtools!)
    (<!* a/close-tab-with-scenario! scenario-id))
  (let [scenario-id (<!* a/open-tab-with-scenario! "no-repl")]
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Dirac requires runtime support from the page context" (seconds 20))
    (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')" (seconds 20))
    (<!* a/close-devtools!)
    (<!* a/close-tab-with-scenario! scenario-id)))