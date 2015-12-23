(ns dirac.sugar
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.windows :as windows]))

; this is a collection of helper utilities to wrap some common chromex code snippets (runtime, tabs and windows)
; for example many callbacks are designed to accept only one parameter as return value
; we can repackage such calls and return directly the only return value passed in as parameter
; anoter area is providing a set of common accessors
;
; Naming conventions:
;   - calls returning a channel should be named "fetch-something"
;   - calls implementing a property access should be named "get-something"

; == property access ========================================================================================================

; -- tab --------------------------------------------------------------------------------------------------------------------

(defn get-tab-id [tab]
  (oget tab "id"))

(defn get-tab-url [tab]
  (oget tab "url"))

(defn get-tab-window-id [tab]
  (oget tab "windowId"))


; == async calls ============================================================================================================

; -- window -----------------------------------------------------------------------------------------------------------------

(defn fetch-window [window-id]
  (go
    (let [[window] (<! (windows/get window-id))]
      window)))

; -- tab --------------------------------------------------------------------------------------------------------------------

(defn fetch-tab [tab-id]
  (go
    (let [[tab] (<! (tabs/get tab-id))]
      tab)))

(defn fetch-tab-window-id [tab-id]
  (go
    (if-let [tab (<! (fetch-tab tab-id))]
      (get-tab-window-id tab))))

(defn fetch-tab-window [tab-id]
  (go
    (if-let [tab (<! (fetch-tab tab-id))]
      (fetch-window (get-tab-window-id tab)))))