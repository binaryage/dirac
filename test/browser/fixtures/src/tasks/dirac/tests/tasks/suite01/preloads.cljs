(ns dirac.tests.tasks.suite01.preloads
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools testing] :as a]))

(go-task
  (with-scenario "normal-via-preloads"
    (<!* a/go-trigger! :check-runtime-installed)
    (<!* a/go-wait-for-match "runtime installed? true")
    (<!* a/go-trigger! :check-runtime-config)
    (<!* a/go-wait-for-match ":external-config-setting is 'configured externally'")))
