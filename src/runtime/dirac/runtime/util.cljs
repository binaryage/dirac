(ns dirac.runtime.util
  (:require [goog.userAgent :as ua]
            [dirac.runtime.prefs :as prefs]))

(defn ^:dynamic unknown-feature-msg [feature known-features lib-info]
  (str "No such feature " feature " is currently available in " lib-info ". "
       "The list of supported features is " (pr-str known-features)))

(defn ^:dynamic feature-not-available-msg [feature]
  (str "Feature " feature " cannot be installed. "
       "Unsupported browser " (ua/getUserAgentString) "."))

; -- banner -----------------------------------------------------------------------------------------------------------------

(defn feature-for-display [installed-features feature]
  (let [color (if (some #{feature} installed-features) "color:#0000ff" "color:#ccc")]
    ["%c%s" [color (str feature)]]))

(defn feature-list-display [installed-features known-features]
  (let [labels (map (partial feature-for-display installed-features) known-features)
        * (fn [accum val]
            [(str (first accum) " " (first val))
             (concat (second accum) (second val))])]
    (reduce * (first labels) (rest labels))))

(defn display-banner! [installed-features known-features fmt & params]
  (let [[fmt-str fmt-params] (feature-list-display installed-features known-features)]
    (.apply (.-info js/console) js/console (into-array (concat [(str fmt " " fmt-str) params] fmt-params)))))

(defn display-banner-if-needed! [features-to-install known-features lib-info]
  (when-not (prefs/pref :dont-display-banner)
    (let [banner (str "Installing %c%s%c and enabling features")
          lib-info-style "color:black;font-weight:bold;"
          reset-style "color:black"]
      (display-banner! features-to-install known-features banner lib-info-style lib-info reset-style))))

; -- unknown features -------------------------------------------------------------------------------------------------------

(defn report-unknown-features! [features known-features lib-info]
  (doseq [feature features]
    (if-not (some #{feature} known-features)
      (.warn js/console (unknown-feature-msg feature known-features lib-info)))))

; -- installer --------------------------------------------------------------------------------------------------------------

(defn install-feature! [feature features-to-install available-fn install-fn]
  (if (some #{feature} features-to-install)
    (if (available-fn feature)
      (install-fn)
      (.warn js/console (feature-not-available-msg feature)))))