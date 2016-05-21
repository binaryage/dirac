(ns dirac.tests.tasks.suite01.disabled-parinfer
  (:require [cljs.core.async]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "normal")
  (<!* a/set-option! :enable-parinfer false)
  (<!* a/open-dirac-devtools!)
  (<!* a/switch-to-console!)
  (<!* a/switch-prompt-to-dirac!)
  (<!* a/set-option! :enable-parinfer true))