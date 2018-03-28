(ns dirac.tests.tasks.suite01.barebone
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools testing] :as a]))

(go-task
  (with-scenario "barebone"
    (<!* a/go-wait-for-match "immediate feedback")
    (<!* a/go-trigger! :test-trigger)
    (<!* a/go-wait-for-match "feedback from trigger")))
