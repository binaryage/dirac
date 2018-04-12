(ns dirac.runtime.util
  (:require-macros [dirac.runtime.util :refer [get-current-browser-name get-current-platform-name]]
                   [dirac.runtime.oops :refer [oget]])
  (:require [goog.userAgent :as ua]
            [goog.object]
            [goog.labs.userAgent.browser :as ua-browser]
            [goog.labs.userAgent.platform :as ua-platform]
            [clojure.string]                                                                                                  ; for dirac.runtime.util macros
            [dirac.project :refer [get-current-version]]
            [dirac.runtime.prefs :as prefs]))

; -- version helpers --------------------------------------------------------------------------------------------------------

(defn ^:dynamic make-version-info [version]
  (str version))

(defn ^:dynamic make-lib-info [version]
  (str "Dirac Runtime " (make-version-info version)))

(defn get-lib-info []
  (make-lib-info (get-current-version)))

(defn str-or-placeholder [val placeholder]
  (if (empty? val)
    placeholder
    val))

(defn platform-str [name name-placeholder version version-placeholder]
  (str (str-or-placeholder name name-placeholder) "/" (str-or-placeholder version version-placeholder)))

(defn get-browser-version-info []
  (let [browser-name (get-current-browser-name)
        browser-version (ua-browser/getVersion)]
    (platform-str browser-name "?" browser-version "?")))

(defn get-browser-platform-info []
  (let [platform-name (get-current-platform-name)
        platform-version (ua-platform/getVersion)]
    (platform-str platform-name "?" platform-version "?")))

; -- node.js support --------------------------------------------------------------------------------------------------------

(defn ^:dynamic get-node-info [root]
  (try
    (let [process (oget root "process")
          version (if process (oget process "version"))
          platform (if process (oget process "platform"))]
      (if (and version platform)
        {:version  version
         :platform platform}))
    (catch :default _
      nil)))

(defn ^:dynamic get-node-description [node-info]
  (platform-str (:platform node-info) "?" (:version node-info) "?"))

(defn ^:dynamic in-node-context? []
  (some? (get-node-info goog/global)))

; -- javascript context utils -----------------------------------------------------------------------------------------------

(defn ^:dynamic get-js-context-description []
  (if-some [node-info (get-node-info goog/global)]
    (str "node/" (get-node-description node-info))
    (let [user-agent (ua/getUserAgentString)]
      (if-not (empty? user-agent)
        user-agent
        "<unknown context>"))))

; -- messages ---------------------------------------------------------------------------------------------------------------

(defn ^:dynamic unknown-feature-msg [feature known-features lib-info]
  (str "No such feature " feature " is currently available in " lib-info ". "
       "The list of supported features is " (pr-str known-features)))

(defn ^:dynamic feature-not-available-msg [feature]
  (str "Feature " feature " cannot be installed. "
       "Unsupported Javascript context: " (get-js-context-description) "."))

; -- banner -----------------------------------------------------------------------------------------------------------------

(defn feature-for-display [installed-features feature]
  (let [color (if (some #{feature} installed-features) "color:#0000ff" "color:#ccc")]
    ["%c%s" [color (str feature)]]))

(defn feature-list-display [installed-features feature-groups]
  (let [labels (map (partial feature-for-display installed-features) (:all feature-groups))
        * (fn [accum val]
            [(str (first accum) " " (first val))
             (concat (second accum) (second val))])]
    (reduce * (first labels) (rest labels))))

(defn display-banner! [installed-features feature-groups fmt & params]
  (let [[fmt-str fmt-params] (feature-list-display installed-features feature-groups)
        items (concat [(str fmt " " fmt-str)] params fmt-params)]
    (.apply (.-info js/console) js/console (into-array items))))

(defn display-banner-if-needed! [features-to-install feature-groups]
  (when-not (prefs/pref :dont-display-banner)
    (let [banner (str "Installing %c%s%c and enabling features")
          lib-info-style "color:black;font-weight:bold;"
          reset-style "color:black"]
      (display-banner! features-to-install feature-groups banner lib-info-style (get-lib-info) reset-style))))

; -- unknown features -------------------------------------------------------------------------------------------------------

(defn report-unknown-features! [features known-features]
  (let [lib-info (get-lib-info)]
    (doseq [feature features]
      (if-not (some #{feature} known-features)
        (.warn js/console (unknown-feature-msg feature known-features lib-info))))))

(defn is-known-feature? [known-features feature]
  (boolean (some #{feature} known-features)))

(defn sanitize-features! [features feature-groups]
  (let [known-features (:all feature-groups)]
    (report-unknown-features! features known-features)
    (filter (partial is-known-feature? known-features) features)))

(defn resolve-features! [features-desc feature-groups]
  (let [features (cond
                   (and (keyword? features-desc) (features-desc feature-groups)) (features-desc feature-groups)
                   (nil? features-desc) (:default feature-groups)
                   (seqable? features-desc) features-desc
                   :else [features-desc])]
    (sanitize-features! features feature-groups)))

; -- installer --------------------------------------------------------------------------------------------------------------

(defn install-feature! [feature features-to-install available-fn install-fn]
  (when (some #{feature} features-to-install)
    (if (available-fn feature)
      (install-fn)
      (.warn js/console (feature-not-available-msg feature)))))
