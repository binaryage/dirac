(ns dirac.runtime
  (:require [dirac.runtime.core :as core]))

; -- PUBLIC API -------------------------------------------------------------------------------------------------------------

(defn install! [& features]
  (apply core/install! features))

(defn uninstall! []
  (core/uninstall!))

(defn enable-features! [& features]
  (apply core/enable-features! features))

(defn disable-features! [& features]
  (apply core/disable-features! features))

(defn set-prefs! [new-prefs]
  (core/set-prefs! new-prefs))

(defn get-prefs []
  (core/get-prefs))

(defn set-pref! [pref val]
  (core/set-pref! pref val))