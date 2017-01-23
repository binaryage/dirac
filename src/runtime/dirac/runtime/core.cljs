(ns dirac.runtime.core
  (:require [dirac.runtime.repl :as repl]
            [dirac.runtime.util :refer [display-banner-if-needed! install-feature! resolve-features!]]
            [dirac.runtime.prefs :as prefs :refer [feature-groups]]))

; -- CORE API ---------------------------------------------------------------------------------------------------------------

(defn is-feature-available? [feature]
  (case feature
    :repl (repl/available?)))

(defn available?
  ([] (available? (prefs/pref :features-to-install)))
  ([features-desc]
   (let [features (resolve-features! features-desc feature-groups)]
     (if (empty? features)
       false
       (every? is-feature-available? features)))))

(defn is-feature-installed? [feature]
  (case feature
    :repl (repl/installed?)))

(defn installed?
  ([] (installed? (prefs/pref :features-to-install)))
  ([features-desc]
   (let [features (resolve-features! features-desc feature-groups)]
     (if (empty? features)
       false
       (every? is-feature-installed? features)))))

(defn install!
  ([] (install! (prefs/pref :features-to-install)))
  ([features-desc]
   (let [features (resolve-features! features-desc feature-groups)]
     (display-banner-if-needed! features feature-groups)
     (install-feature! :repl features is-feature-available? repl/install!))))

(defn uninstall! []
  (repl/uninstall!))
