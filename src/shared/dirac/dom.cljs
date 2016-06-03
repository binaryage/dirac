(ns dirac.dom
  (:require [clojure.string :as string]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.dom.shim]))

; -- DOM access -------------------------------------------------------------------------------------------------------------

(defn query-selector [selector]
  (.querySelectorAll js/document selector))

(defn get-tag-name [el]
  (if-let [tag-name (oget el "tagName")]
    (string/lower-case tag-name)))

(defn get-class-name [el]
  (oget el "className"))

(defn get-children [el]
  (oget el "children"))

(defn get-shadow-root [el]
  (oget el "shadowRoot"))

(defn get-own-text-content [el]
  (if (empty? (get-children el))
    (oget el "textContent")))

(defn get-title [el]
  (oget el "title"))