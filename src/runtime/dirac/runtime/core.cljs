(ns dirac.runtime.core
  (:require [dirac.project :refer [get-current-version]]
            [dirac.runtime.prefs :as prefs]
            [dirac.runtime.repl :as repl]
            [dirac.runtime.util :refer-macros [display-banner]]
            [goog.userAgent :as ua]))

(def known-features [:repl])
(def features-to-install-by-default [:repl])

(defn ^:dynamic make-version-info []
  (let [version (get-current-version)]
    (str "v" version)))

(defn ^:dynamic make-lib-info []
  (str "Dirac Runtime " (make-version-info)))

(defn ^:dynamic missing-feature-warning [feature known-features]
  (str "No such feature " feature " is currently available in " (make-lib-info) ". "
       "The list of supported features is " (pr-str known-features)))

(defn ^:dynamic warn-feature-not-available [feature]
  (.warn js/console (str "Feature " feature " cannot be installed. Unsupported browser " (ua/getUserAgentString) ".")))

; -- CORE API ---------------------------------------------------------------------------------------------------------------

(defn set-prefs! [new-prefs]
  (prefs/set-prefs! new-prefs))

(defn get-prefs []
  (prefs/get-prefs))

(defn set-pref! [pref val]
  (prefs/set-pref! pref val))

(defn is-feature-available? [feature]
  (case feature
    :repl (repl/available?)))

(defn install! [features-to-install]
  (let [banner (str "Installing %c%s%c and enabling features")
        lib-info (make-lib-info)
        lib-info-style "color:black;font-weight:bold;"
        reset-style "color:black"]
    (display-banner features-to-install known-features banner lib-info-style lib-info reset-style)
    (if (some #{:repl} features-to-install)
      (if (is-feature-available? :repl)
        (repl/install!)
        (warn-feature-not-available :repl)))))

(defn uninstall! []
  (repl/uninstall!))