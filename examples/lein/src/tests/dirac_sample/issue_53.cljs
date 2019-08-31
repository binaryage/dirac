(ns dirac-sample.issue-53
  (:require-macros [dirac-sample.logging :refer [log]]))

; https://github.com/binaryage/dirac/issues/53

(defn repro [count]
  (let [x 1
        y 2
        x 3
        z #(println x)]
    (js-debugger)))

(defn ^:export trigger []
  (repro 3))
