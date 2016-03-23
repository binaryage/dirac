(ns dirac.implant.version
  (:require [dirac.project]))

(def version dirac.project/version)

(defmacro get-version []
  version)