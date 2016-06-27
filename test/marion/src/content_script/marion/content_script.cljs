(ns marion.content-script
  (:require [marion.content-script.core :as core]
            [devtools.preload]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (core/init!))
