(ns marion.content-script
  (:require [marion.content-script.core :as core]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (core/init!))