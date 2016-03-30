(ns dirac.runtime
  (:require [dirac.runtime.core :as core]))

(def api-version 2)

; -- PUBLIC API -------------------------------------------------------------------------------------------------------------

(defn ^:export install! [features]
  (core/install! features))

(defn ^:export uninstall! []
  (core/uninstall!))

(defn ^:export set-prefs! [new-prefs]
  (core/set-prefs! new-prefs))

(defn ^:export get-prefs []
  (core/get-prefs))

(defn ^:export set-pref! [pref val]
  (core/set-pref! pref val))

(defn ^:export get-api-version []
  api-version)