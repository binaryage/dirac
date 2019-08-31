(ns dirac-sample.inline-breakpoints
  (:require-macros [dirac-sample.logging :refer [log]])
  (:require [clojure.string :as string]))

(defn ^:export trigger []
  (map (fn [x] (str x)) (range 10))
  (-> "abc_efg"
      (string/upper-case)
      (string/replace #"ABC" "XYZ")))
