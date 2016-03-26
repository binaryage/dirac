(ns dirac.runtime.core
  (:require [dirac.runtime.prefs :as prefs]
            [dirac.runtime.repl :as repl]
            [dirac.runtime.util :as util]
            [goog.userAgent :as ua]))

(def known-features
  [:repl])

(defn ^:dynamic missing-feature-warning [feature known-features]
  (str "No such feature '" feature "' is currently available in Dirac runtime. "
       "The list of supported features is " (pr-str known-features)))

(defn ^:dynamic warn-feature-not-available [feature]
  (.warn js/console (str "Dirac runtime feature '" feature
                         "' cannot be installed. Unsupported browser " (ua/getUserAgentString) ".")))

; -- CORE API ---------------------------------------------------------------------------------------------------------------

(defn set-prefs! [new-prefs]
  (prefs/set-prefs! new-prefs))

(defn get-prefs []
  (prefs/get-prefs))

(defn set-pref! [pref val]
  (prefs/set-pref! pref val))

(defn set-feature! [feature val]
  (if (some #{feature} known-features)
    (set-pref! (util/feature-installation-pref-key feature) val)
    (.warn js/console (missing-feature-warning feature known-features))))

(defn enable-feature! [feature]
  (set-feature! feature true))

(defn disable-feature! [feature]
  (set-feature! feature false))

(defn enable-features! [& features]
  (doseq [feature features]
    (enable-feature! feature)))

(defn disable-features! [& features]
  (doseq [feature features]
    (disable-feature! feature)))

(defn feature-available? [feature]
  (case feature
    :repl (repl/available?)))

(defn features-available? [& features]
  (every? feature-available? features))

(defn install! [& features]
  (apply enable-features! features)
  (util/display-banner "Installing Dirac runtime:" known-features)
  (if (prefs/pref (util/feature-installation-pref-key :repl))
    (if (repl/available?)
      (repl/install!)
      (warn-feature-not-available :repl))))

(defn uninstall! []
  (repl/uninstall!))