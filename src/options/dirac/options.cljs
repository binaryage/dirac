(ns dirac.options
  (:require [dirac.options.core :as core]
            [dirac.utils :refer [runonce]]))

(runonce
  (core/init!))
