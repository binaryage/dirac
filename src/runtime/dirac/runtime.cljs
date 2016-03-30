(ns dirac.runtime
  (:require [dirac.runtime.core :as core]
            [dirac.runtime.prefs :as prefs]))

(def api-version 2)

; -- PUBLIC API -------------------------------------------------------------------------------------------------------------

(defn ^:export get-api-version []
  api-version)

(def ^:export install! core/install!)
(def ^:export uninstall! core/uninstall!)
(def ^:export set-prefs! prefs/set-prefs!)
(def ^:export get-prefs prefs/get-prefs)
(def ^:export set-pref! prefs/set-pref!)