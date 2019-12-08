(ns dirac.automation.devtools
  (:require [devtools.core :as devtools]
            [devtools.prefs :as devtools-prefs]
            [dirac.automation.logging :refer [error info log warn]]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]
            [oops.core :refer [oapply ocall oget oset!]]))

(defn init-devtools! [& [config]]
  (devtools-prefs/set-pref! :dont-detect-custom-formatters true)
  (when-let [devtools-prefs (:devtools-prefs config)]                                                                         ; override devtools prefs
    (log "devtools override: set prefs " devtools-prefs)
    (devtools-prefs/merge-prefs! devtools-prefs))
  (if-not (:do-not-install-devtools config)                                                                                   ; override devtools features/installation
    (devtools/install!)
    (log "devtools override: do not install")))
