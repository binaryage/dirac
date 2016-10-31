(ns dirac.runtime
  (:require [dirac.project :refer [get-current-version]]
            [dirac.runtime.core :as core]
            [dirac.runtime.prefs :as prefs]))

; -- PUBLIC API -------------------------------------------------------------------------------------------------------------

(def ^:export get-version get-current-version)

(def ^:export available? core/available?)
(def ^:export installed? core/installed?)
(def ^:export install! core/install!)
(def ^:export uninstall! core/uninstall!)

(def ^:export get-tag core/get-tag)

(def ^:export get-prefs prefs/get-prefs)
(def ^:export get-pref prefs/pref)
(def ^:export set-prefs! prefs/set-prefs!)
(def ^:export set-pref! prefs/set-pref!)
