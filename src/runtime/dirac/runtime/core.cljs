(ns dirac.runtime.core
  (:require-macros [dirac.runtime.core :refer [get-current-browser-name get-current-platform-name]])
  (:require [dirac.project :refer [get-current-version]]
            [dirac.runtime.repl :as repl]
            [dirac.runtime.util :refer [display-banner-if-needed! install-feature! resolve-features! get-lib-info]]
            [dirac.runtime.prefs :as prefs]
            [goog.labs.userAgent.browser :as ua-browser]
            [goog.labs.userAgent.platform :as ua-platform]))

(def known-features [:repl])
(def default-features [:repl])
(def feature-groups {:all     known-features
                     :default default-features})

; -- CORE API ---------------------------------------------------------------------------------------------------------------

(defn is-feature-available? [feature]
  (case feature
    :repl (repl/available?)))

(defn available?
  ([] (available? :default))
  ([features-desc]
   (let [features (resolve-features! features-desc feature-groups)]
     (if (empty? features)
       false
       (every? is-feature-available? features)))))

(defn is-feature-installed? [feature]
  (case feature
    :repl (repl/installed?)))

(defn installed?
  ([] (installed? :default))
  ([features-desc]
   (let [features (resolve-features! features-desc feature-groups)]
     (if (empty? features)
       false
       (every? is-feature-installed? features)))))

(defn install!
  ([] (install! :default))
  ([features-desc]
   (let [features (resolve-features! features-desc feature-groups)]
     (display-banner-if-needed! features feature-groups)
     (install-feature! :repl features is-feature-available? repl/install!))))

(defn uninstall! []
  (repl/uninstall!))

(defn get-tag-data []
  (let [tag (prefs/pref :runtime-tag)
        url (str js/location)
        browser-version (ua-browser/getVersion)
        browser-name (get-current-browser-name)
        browser (str (or browser-name "?") "/" browser-version)
        platform-version (ua-platform/getVersion)
        platform-name (get-current-platform-name)
        platform (str (or platform-name "?") "/" platform-version)]
    {:tag      tag
     :url      url
     :browser  browser
     :platform platform}))

(defn get-tag []
  (let [{:keys [tag url browser platform]} (get-tag-data)]
    (apply str (interpose " | " [tag url browser platform]))))