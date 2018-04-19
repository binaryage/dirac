(ns dirac.tests.tasks.suite01.preloads
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-scenario] :as a]
            [dirac.shared.async]))

(go-task
  (with-scenario "normal-via-preloads"
    (<!* a/go-trigger! :check-runtime-installed)
    (<!* a/go-wait-for-match "runtime installed? true")
    (<!* a/go-trigger! :check-runtime-config)
    (<!* a/go-wait-for-match ":external-config-setting is 'configured externally'")))
