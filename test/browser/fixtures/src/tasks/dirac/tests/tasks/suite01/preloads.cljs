(ns dirac.tests.tasks.suite01.preloads
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools testing] :as a]))

(go-task
  (with-scenario "normal-via-preloads"
    (<!* a/trigger! :check-runtime-installed)
    (<!* a/wait-for-match "runtime installed? true")
    (<!* a/trigger! :check-runtime-config)
    (<!* a/wait-for-match ":external-config-setting is 'configured externally'")))
