(ns marion.dev.devtools
  (:require [devtools.core :as devtools]
            [dirac.utils :refer-macros [runonce]]))

(runonce
  (devtools/set-pref! :dont-detect-custom-formatters true)
  (devtools/install! :all))
