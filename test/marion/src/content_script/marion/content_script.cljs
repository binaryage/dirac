(ns marion.content-script
  (:require [marion.content-script.core :as core]
            [dirac.shared.utils :refer [runonce]]))

(runonce
  (core/init!))
