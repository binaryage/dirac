(ns dirac.implant.version
  (:require-macros [dirac.implant.version :refer [get-version]]))

(def ^:dynamic version (get-version))