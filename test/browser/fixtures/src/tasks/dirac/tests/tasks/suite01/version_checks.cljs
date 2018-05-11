(ns dirac.tests.tasks.suite01.version-checks
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-scenario] :as a]
            [dirac.settings :refer [minutes seconds]]
            [dirac.shared.async]))

(go-task
  (with-scenario "old-runtime"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-match "Version mismatch: Dirac Runtime installed in your app has different version")
      (<!* a/go-wait-for-prompt-to-enter-edit-mode)))
  (with-scenario "future-runtime"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-match "Version mismatch: Dirac Runtime installed in your app has different version")
      (<!* a/go-wait-for-prompt-to-enter-edit-mode)))
  (with-scenario "normal-with-feedback"
    (with-devtools {"mock_old_extension_version" 1}
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-match "Version mismatch: Dirac Runtime installed in your app has different version")
      (<!* a/go-wait-for-match "Version mismatch: Dirac Agent has a different version")
      (<!* a/go-wait-for-prompt-to-enter-edit-mode)))
  (with-scenario "normal-with-feedback"
    (with-devtools {"mock_future_extension_version" 1}
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-match "Version mismatch: Dirac Runtime installed in your app has different version")
      (<!* a/go-wait-for-match "Version mismatch: Dirac Agent has a different version")
      (<!* a/go-wait-for-prompt-to-enter-edit-mode)))
  (with-scenario "old-repl-api"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-match "Dirac REPL API version mismatch detected.")
      (<!* a/go-wait-for-match "but your version is v0")
      (<!* a/go-wait-for-devtools-match "setDiracPromptStatusStyle('error')")))
  (with-scenario "future-repl-api"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-match "Dirac REPL API version mismatch detected.")
      (<!* a/go-wait-for-match "but your version is v1000")
      (<!* a/go-wait-for-devtools-match "setDiracPromptStatusStyle('error')")))
  (with-scenario "no-runtime"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-match "Dirac requires runtime support from your app." (seconds 20))
      (<!* a/go-wait-for-devtools-match "setDiracPromptStatusStyle('error')" (seconds 20))))
  (with-scenario "no-repl"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      (<!* a/go-switch-prompt-to-dirac!)
      (<!* a/go-wait-for-match "Dirac Runtime is present in your app but the :repl feature hasn't been enabled." (seconds 20))
      (<!* a/go-wait-for-devtools-match "setDiracPromptStatusStyle('error')" (seconds 20)))))
