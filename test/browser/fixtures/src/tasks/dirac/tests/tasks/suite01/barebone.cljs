(ns dirac.tests.tasks.suite01.barebone
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools testing] :as a]))

(go-task
  (with-scenario "barebone"
    (<!* a/wait-for-match "immediate feedback")
    (<!* a/trigger! :test-trigger)
    (<!* a/wait-for-match "feedback from trigger")))
