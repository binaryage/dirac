(ns dirac.runtime.tag
  (:require-macros [dirac.runtime.tag :refer [get-current-browser-name get-current-platform-name]])
  (:require [dirac.runtime.util :refer [get-js-context-description in-node-context? platform-str]]
            [goog.labs.userAgent.browser :as ua-browser]
            [goog.labs.userAgent.platform :as ua-platform]
            [dirac.runtime.prefs :as prefs]))

; -- tag api ----------------------------------------------------------------------------------------------------------------

(defn get-browser-tag-data []
  (let [tag (prefs/pref :runtime-tag)
        url (str js/location)
        browser-name (get-current-browser-name)
        browser-version (ua-browser/getVersion)
        browser (platform-str browser-name "?" browser-version "?")
        platform-name (get-current-platform-name)
        platform-version (ua-platform/getVersion)
        platform (platform-str platform-name "?" platform-version "?")]
    {:tag      tag
     :url      url
     :browser  browser
     :platform platform}))

(defn get-node-tag-data []
  (let [tag (prefs/pref :runtime-tag)
        platform (get-js-context-description)]
    {:tag      tag
     :platform platform}))

(defn get-tag []
  (apply str (interpose " | " (if (in-node-context?)
                                ((juxt :tag :platform) (get-node-tag-data))
                                ((juxt :tag :url :browser :platform) (get-browser-tag-data))))))
