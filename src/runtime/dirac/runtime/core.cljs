(ns dirac.runtime.core
  (:require-macros [dirac.runtime.core :refer [get-current-browser-name get-current-platform-name]])
  (:require [dirac.project :refer [get-current-version]]
            [dirac.runtime.repl :as repl]
            [dirac.runtime.util :refer [display-banner-if-needed! report-unknown-features! install-feature! make-version-info
                                        make-lib-info]]
            [dirac.runtime.prefs :as prefs]
            [goog.labs.userAgent.browser :as ua-browser]
            [goog.labs.userAgent.platform :as ua-platform]))

(def known-features [:repl])
(def features-to-install-by-default [:repl])

; -- CORE API ---------------------------------------------------------------------------------------------------------------

(defn is-feature-available? [feature]
  (case feature
    :repl (repl/available?)))

(defn install!
  ([] (install! features-to-install-by-default))
  ([features-to-install]
   (let [features (if (some? features-to-install) features-to-install features-to-install-by-default)
         lib-info (make-lib-info (get-current-version))]
     (report-unknown-features! features known-features lib-info)
     (display-banner-if-needed! features known-features lib-info)
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