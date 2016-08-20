(ns dirac.tests.tasks.suite01.runtime-api
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools] :as a]))

(go-task
  (with-scenario "runtime-api"
    (<!* a/trigger! :run-tests)
    (<!* a/wait-for-match "install/uninstall tests done")
    (<!* a/wait-for-match "prefs tests done")
    (<!* a/wait-for-match "runtime tags tests done")))
