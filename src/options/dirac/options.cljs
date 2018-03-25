(ns dirac.options
  (:require [dirac.options.core :as core]
            [dirac.shared.utils :refer [runonce]]))

(runonce
  (core/init!))
