(ns dirac.implant.version
  (:require [dirac.project]))

(defonce version dirac.project/version)

(defmacro get-version []
  version)