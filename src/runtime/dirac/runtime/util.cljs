(ns dirac.runtime.util
  (:require [dirac.runtime.prefs :as prefs]))

(defn feature-installation-pref-key [feature]
  (keyword (str "install-" (name feature))))

(defn feature-for-display [feature]
  (let [feature-installation-key (feature-installation-pref-key feature)
        enabled? (prefs/pref feature-installation-key)
        color (if enabled? "color:#0000ff" "color:#aaaaaa")]
    ["%c%s" [color (name feature)]]))

(defn feature-list-display [known-features]
  (let [labels (map feature-for-display known-features)
        * (fn [accum val]
            [(str (first accum) " " (first val))
             (concat (second accum) (second val))])]
    (reduce * (first labels) (rest labels))))

(defn log-info [& args]
  (.apply (.-info js/console) js/console (to-array args)))

(defn display-banner [prefix known-features]
  (when-not (prefs/pref :dont-display-banner)
    (let [[fmt-str params] (feature-list-display known-features)]
      (apply log-info (str prefix " " fmt-str) params))))