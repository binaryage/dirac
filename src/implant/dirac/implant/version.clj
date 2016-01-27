(ns dirac.implant.version
  (:require [dirac.version]))

(def version dirac.version/version)

(defmacro get-version []
  version)