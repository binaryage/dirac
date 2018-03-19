(ns dirac.background
  (:require [dirac.background.core :as core]
            [dirac.utils :refer [runonce]]))

(runonce
  (core/init!))
