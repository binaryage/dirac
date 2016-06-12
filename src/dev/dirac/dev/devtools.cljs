(ns dirac.dev.devtools
  (:require [devtools.core :as devtools]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (devtools/install! :all))
