(ns dirac.implant.info
  (:require-macros [dirac.runtime.core :refer [get-current-browser-name get-current-platform-name]])
  (:require [oops.core :refer [oget oset! ocall oapply gget]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [goog.labs.userAgent.browser :as ua-browser]
            [goog.labs.userAgent.platform :as ua-platform]
            [dirac.implant.version :refer [get-version]]
            [clojure.string :as string]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn part-str [val placeholder]
  (if (empty? val)
    placeholder
    val))

(defn combo-str [name name-placeholder version version-placeholder]
  (str (part-str name name-placeholder) "/" (part-str version version-placeholder)))

(defn make-chrome-info [tag rev]
  (str tag "@" (.substring rev 0 7)))

; -- versions ---------------------------------------------------------------------------------------------------------------

(defn get-version-info []
  (str "Dirac v" (get-version)))

(defn get-browser-info []
  (let [browser-name (get-current-browser-name)
        browser-version (ua-browser/getVersion)]
    (combo-str browser-name "?" browser-version "?")))

(defn get-platform-info []
  (let [platform-name (get-current-platform-name)
        platform-version (ua-platform/getVersion)]
    (combo-str platform-name "?" platform-version "?")))

; -- backend API ------------------------------------------------------------------------------------------------------------

(defn get-backend-api-mode []
  (gget "Protocol" "?BakedInspectorBackendMode"))

(defn get-backend-api-mode-info []
  (gget "Protocol" "?BakedInspectorBackendModeInfo"))

(defn get-backend-api-chrome-tag []
  (gget "Protocol" "?BakedInspectorBackendAPIChromeTag"))

(defn get-backend-api-chrome-rev []
  (gget "Protocol" "?BakedInspectorBackendAPIChromeRev"))

(defn get-backend-api-chrome-info []
  (make-chrome-info (get-backend-api-chrome-tag) (get-backend-api-chrome-rev)))

(defn get-backend-api-info []
  (let [mode (or (get-backend-api-mode) "?")
        info (case mode
               "internal" (str "internal-" (get-backend-api-chrome-info))
               mode)
        more (get-backend-api-mode-info)]
    (str "Backend API/" info (if more (str "/" more)))))

; -- backend CSS ------------------------------------------------------------------------------------------------------------

(defn get-backend-css-mode []
  (gget "Protocol" "?BakedSupportedCSSPropertiesMode"))

(defn get-backend-css-mode-info []
  (gget "Protocol" "?BakedSupportedCSSPropertiesModeInfo"))

(defn get-backend-css-chrome-tag []
  (gget "Protocol" "?BakedSupportedCSSPropertiesChromeTag"))

(defn get-backend-css-chrome-rev []
  (gget "Protocol" "?BakedSupportedCSSPropertiesChromeRev"))

(defn get-backend-css-chrome-info []
  (make-chrome-info (get-backend-css-chrome-tag) (get-backend-css-chrome-rev)))

(defn get-backend-css-info []
  (let [mode (or (get-backend-css-mode) "?")
        info (case mode
               "internal" (str "internal-" (get-backend-css-chrome-info))
               mode)
        more (get-backend-css-mode-info)]
    (str "Backend CSS/" info (if more (str "/" more)))))

; -- public -----------------------------------------------------------------------------------------------------------------

(defn get-info-line []
  (let [parts [(get-version-info) (get-browser-info) (get-platform-info) (get-backend-api-info) (get-backend-css-info)]]
    (string/join ", " parts)))
