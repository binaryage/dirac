(ns dirac.background
  (:require [dirac.background.core :as core]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (core/init!))
