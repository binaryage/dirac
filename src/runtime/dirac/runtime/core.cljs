(ns dirac.runtime.core
  (:require-macros [dirac.runtime.core :refer [get-current-browser-name get-current-platform-name]])
  (:require [dirac.project :refer [get-current-version]]
            [dirac.runtime.repl :as repl]
            [dirac.runtime.util :refer [display-banner-if-needed! install-feature! resolve-features!]]
            [dirac.runtime.prefs :as prefs :refer [feature-groups known-features]]
            [goog.labs.userAgent.browser :as ua-browser]
            [goog.labs.userAgent.platform :as ua-platform]))

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

(defn part-str [val placeholder]
  (if (empty? val)
    placeholder
    val))

(defn combo-str [name name-placeholder version version-placeholder]
  (str (part-str name name-placeholder) "/" (part-str version version-placeholder)))

(defn get-tag-data []
  (let [tag (prefs/pref :runtime-tag)
        url (str js/location)
        browser-name (get-current-browser-name)
        browser-version (ua-browser/getVersion)
        browser (combo-str browser-name "unknown-browser" browser-version "unknown-version")
        platform-name (get-current-platform-name)
        platform-version (ua-platform/getVersion)
        platform (combo-str platform-name "unknown-platform" platform-version "unknown-version")]
    {:tag      tag
     :url      url
     :browser  browser
     :platform platform}))

(defn get-tag []
  (let [{:keys [tag url browser platform]} (get-tag-data)]
    (apply str (interpose " | " [tag url browser platform]))))
