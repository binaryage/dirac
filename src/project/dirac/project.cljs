(ns dirac.project
  (:require-macros [dirac.project :refer [get-current-version]]))

(def current-version (get-current-version))

(defn get-current-version []
  current-version)