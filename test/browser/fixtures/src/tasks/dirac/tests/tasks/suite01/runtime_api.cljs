(ns dirac.tests.tasks.suite01.runtime-api
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools testing] :as a]))

(go-task
  (with-scenario "runtime-api"
    (<!* a/go-trigger! :run-tests)
    (<!* a/go-wait-for-match "install/uninstall tests done")
    (<!* a/go-wait-for-match "prefs tests done")
    (<!* a/go-wait-for-match "runtime tags tests done")))
