(ns marion.background
  (:require [dirac.shared.utils :refer [runonce]]
            [marion.background.core :as core]))

(runonce
  (core/init!))
