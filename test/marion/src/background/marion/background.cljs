(ns marion.background
  (:require [marion.background.core :as core]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (core/init!))