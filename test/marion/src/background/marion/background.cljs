(ns marion.background
  (:require [marion.background.core :as core]
            [dirac.shared.utils :refer [runonce]]))

(runonce
  (core/init!))
