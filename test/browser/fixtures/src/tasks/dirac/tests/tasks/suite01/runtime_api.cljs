(ns dirac.tests.tasks.suite01.runtime-api
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-scenario] :as a]
            [dirac.shared.async]))

(go-task
  (with-scenario "runtime-api"
    (<!* a/go-trigger! :run-tests)
    (<!* a/go-wait-for-match "install/uninstall tests done")
    (<!* a/go-wait-for-match "prefs tests done")
    (<!* a/go-wait-for-match "runtime tags tests done")))
