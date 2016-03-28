(ns dirac.runtime
  (:require [dirac.runtime.core :as core]))

; -- PUBLIC API -------------------------------------------------------------------------------------------------------------

(defn install! [features]
  (core/install! features))

(defn uninstall! []
  (core/uninstall!))

(defn set-prefs! [new-prefs]
  (core/set-prefs! new-prefs))

(defn get-prefs []
  (core/get-prefs))

(defn set-pref! [pref val]
  (core/set-pref! pref val))