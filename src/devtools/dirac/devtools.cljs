(ns dirac.devtools
  (:require [devtools.core :as devtools]
            [dirac.shared.utils :refer [runonce when-not-advanced-mode]]))

(defn install-devtools-if-needed! []
  (when-not-advanced-mode
    (devtools/install!)))

(runonce (install-devtools-if-needed!))
