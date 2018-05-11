(ns marion.content-script
  (:require [dirac.shared.utils :refer [runonce]]
            [marion.content-script.core :as core]))

(runonce
  (core/init!))
