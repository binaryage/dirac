(ns dirac.shared.dom
  (:require [clojure.string :as string]
            [oops.core :refer [oget oset! ocall oapply]]
            [dirac.shared.logging :refer [log warn error info]]
            [dirac.shared.dom.shim]))

; -- DOM access -------------------------------------------------------------------------------------------------------------

(defn element? [v]
  (instance? js/HTMLElement v))

(defn query-selector
  ([selector] (.querySelectorAll js/document selector))
  ([element selector] (.querySelectorAll element selector)))

(defn get-tag-name [el]
  (if-let [tag-name (oget el "?tagName")]
    (string/lower-case tag-name)))

(defn get-class-name [el]
  (oget el "?className"))

(defn get-children [el]
  (oget el "?children"))

(defn get-shadow-root [el]
  (oget el "?shadowRoot"))

(defn get-own-text-content [el]
  (if (empty? (get-children el))
    (oget el "?textContent")))

(defn get-title [el]
  (oget el "?title"))

(defn get-next-sibling [el]
  (oget el "nextSibling"))
