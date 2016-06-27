(ns marion.background
  (:require [marion.background.core :as core]
            [devtools.preload]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (core/init!))
