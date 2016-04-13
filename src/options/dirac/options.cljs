(ns dirac.options
  (:require [dirac.options.core :as core]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (core/init!))