(ns dirac.tests.tasks.suite01.without-runtime
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "no-runtime-install")
  (<!* a/wait-for-match "test immediate feedback")
  (<!* a/trigger! :test-if-installed)
  (<!* a/wait-for-match "(dirac.runtime/installed? :repl) => false")
  (<!* a/wait-for-match "(dirac.runtime/installed? [:repl]) => false"))