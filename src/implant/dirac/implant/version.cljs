(ns dirac.implant.version
  (:require-macros [dirac.implant.version :refer [get-version]]))

(defonce version (get-version))