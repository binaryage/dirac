(ns dirac.devtools
  (:require [dirac.shared.utils :refer [runonce when-not-advanced-mode]]
            [devtools.core :as devtools]))

(defn install-devtools-if-needed! []
  (when-not-advanced-mode
    (devtools/install!)))

(runonce (install-devtools-if-needed!))
