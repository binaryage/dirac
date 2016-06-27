(ns dirac.background
  (:require [dirac.background.core :as core]
            [devtools.preload]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (core/init!))
