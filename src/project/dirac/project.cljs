(ns dirac.project
  (:require-macros [dirac.project :refer [get-current-version]]))

(def version (get-current-version))

(defn get-current-version []
  version)
