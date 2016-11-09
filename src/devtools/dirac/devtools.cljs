(ns dirac.devtools
  (:require [dirac.utils :refer [runonce when-not-advanced-mode]]
            [devtools.core :as devtools]))

(defn install-devtools-if-needed! []
  (when-not-advanced-mode
    (devtools/install! :all)))

(runonce (install-devtools-if-needed!))
