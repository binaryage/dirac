(ns dirac-sample.issue-7
  (:require-macros [dirac-sample.logging :refer [log]]))

; https://github.com/binaryage/dirac/issues/7

(def circular1 (atom nil))
(reset! circular1 circular1)

(defn ^:export trigger []
  (let [circular circular1]
    ; at this point we should be able to play with infinitely expanding structure "circular" in Scope Panel to expose issue #7
    (js-debugger)))

(new x)
