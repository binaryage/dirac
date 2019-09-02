(ns dirac-lein.inline-breakpoints
  (:require-macros [dirac-lein.logging :refer [log]])
  (:require [clojure.string :as string]))

(defn ^:export trigger []
  (map (fn [x] (str x)) (range 10))
  (-> "abc_efg"
      (string/upper-case)
      (string/replace #"ABC" "XYZ")))
