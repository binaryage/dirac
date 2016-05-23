(ns dirac.tests.tasks.suite01.disabled-parinfer
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "normal")
  (<!* a/set-option! :enable-parinfer false)
  (<!* a/open-devtools!)
  (<!* a/switch-to-console-panel!)
  (<!* a/switch-prompt-to-dirac!)
  (<!* a/set-option! :enable-parinfer true))