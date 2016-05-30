(ns dirac.tests.tasks.suite01.barebone
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "barebone")
  (<!* a/wait-for-match "immediate feedback")
  (<!* a/trigger! :test-trigger)
  (<!* a/wait-for-match "feedback from trigger"))