(ns dirac.automation.status
  (:require [oops.core :refer [oget gcall! ocall! oset! gcall]]))

; status is a <div> tag which shows status of fixtures page

(defn set-style! [status-el & [style]]
  {:pre [status-el]}
  (let [class-names (str "status" (if (some? style) (str " status-" style)))]
    (oset! status-el "className" class-names)))

(defn make-status []
  (let [status-el (gcall "document.createElement" "div")]
    (set-style! status-el)
    status-el))

(defn create-status! [parent-el]
  {:pre [parent-el]}
  (let [status-el (make-status)]
    (ocall! parent-el "appendChild" status-el)
    status-el))

(defn destroy-status! [status-el]
  {:pre [status-el]}
  (ocall! status-el "remove"))

(defn set-status! [status-el text]
  {:pre [status-el]}
  (oset! status-el "textContent" text))

(defn clear-status! [status-el]
  {:pre [status-el]}
  (set-status! status-el ""))
