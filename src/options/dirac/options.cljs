(ns dirac.options
  (:require [dirac.options.core :as core]
            [devtools.preload]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (core/init!))
