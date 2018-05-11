(ns dirac.tests.tasks.suite01.barebone
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-scenario] :as a]
            [dirac.shared.async]))

(go-task
  (with-scenario "barebone"
    (<!* a/go-wait-for-match "immediate feedback")
    (<!* a/go-trigger! :test-trigger)
    (<!* a/go-wait-for-match "feedback from trigger")))
