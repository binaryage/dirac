(ns dirac.background
  (:require [dirac.background.core :as core]
            [dirac.shared.utils :refer [runonce]]))

(runonce
  (core/init!))
