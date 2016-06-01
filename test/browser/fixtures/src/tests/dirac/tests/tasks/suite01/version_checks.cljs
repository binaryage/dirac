(ns dirac.tests.tasks.suite01.version-checks
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario] :as a]))

(go-task
  (with-scenario "old-runtime"
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Version mismatch: Dirac Runtime installed in the page has different version")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-prompt-to-enter-edit-mode)
    (<!* a/close-devtools!))
  (with-scenario "future-runtime"
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Version mismatch: Dirac Runtime installed in the page has different version")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-prompt-to-enter-edit-mode)
    (<!* a/close-devtools!))
  (with-scenario "normal-with-feedback"
    (<!* a/open-devtools! {"mock_old_extension_version" 1})
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match #"Version mismatch: Dirac Runtime installed in the page has different version .*? than Dirac Chrome Extension \(v0\.0\.1\)\.")
    (<!* a/wait-for-match #"Version mismatch: Dirac Agent has different version .*? than Dirac Chrome Extension \(v0\.0\.1\)\.")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-prompt-to-enter-edit-mode)
    (<!* a/close-devtools!))
  (with-scenario "normal-with-feedback"
    (<!* a/open-devtools! {"mock_future_extension_version" 1})
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match #"Version mismatch: Dirac Runtime installed in the page has different version .*? than Dirac Chrome Extension \(v1000\.0\.1\)\.")
    (<!* a/wait-for-match #"Version mismatch: Dirac Agent has different version .*? than Dirac Chrome Extension \(v1000\.0\.1\)\.")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-prompt-to-enter-edit-mode)
    (<!* a/close-devtools!))
  (with-scenario "old-repl-api"
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Dirac REPL API version mismatch detected.")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')")
    (<!* a/close-devtools!))
  (with-scenario "future-repl-api"
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Dirac REPL API version mismatch detected.")
    (<!* a/wait-for-devtools-match "console prompt focused")
    (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')")
    (<!* a/close-devtools!))
  (with-scenario "no-runtime"
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Dirac requires runtime support from the page context" (seconds 20))
    (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')" (seconds 20))
    (<!* a/close-devtools!))
  (with-scenario "no-repl"
    (<!* a/open-devtools!)
    (<!* a/switch-to-console-panel!)
    (<!* a/switch-prompt-to-dirac!)
    (<!* a/wait-for-match "Dirac requires runtime support from the page context" (seconds 20))
    (<!* a/wait-for-devtools-match "setDiracPromptStatusStyle('error')" (seconds 20))
    (<!* a/close-devtools!)))