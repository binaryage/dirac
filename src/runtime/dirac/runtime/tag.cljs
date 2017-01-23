(ns dirac.runtime.tag
  (:require [dirac.runtime.util :refer [get-js-context-description in-node-context?
                                        get-browser-platform-info get-browser-version-info]]
            [dirac.runtime.prefs :as prefs]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn- prepare-tag-line [items]
  (apply str (interpose " | " items)))

; -- tag api ----------------------------------------------------------------------------------------------------------------

(defn get-browser-tag-data []
  {:tag      (prefs/pref :runtime-tag)
   :url      (str js/location)
   :browser  (get-browser-version-info)
   :platform (get-browser-platform-info)})

(defn get-node-tag-data []
  {:tag      (prefs/pref :runtime-tag)
   :platform (get-js-context-description)})

(defn get-tag []
  (prepare-tag-line (if (in-node-context?)
                      ((juxt :tag :platform) (get-node-tag-data))
                      ((juxt :tag :url :browser :platform) (get-browser-tag-data)))))
