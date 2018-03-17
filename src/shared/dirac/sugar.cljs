(ns dirac.sugar
  (:require [cljs.core.async :refer [<! chan put! close! go go-loop]]
            [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.config :refer-macros [with-muted-error-reporting]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.windows :as windows]
            [dirac.utils :as utils]))

; this is a collection of helper utilities to wrap some common chromex code snippets (runtime, tabs and windows)
; for example many callbacks are designed to accept only one parameter as return value
; we can repackage such calls and return directly the only return value passed in as parameter
; another area is providing a set of common accessors
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

(defn set-window-params-dimensions! [window-params left top width height]
  (if (some? left)
    (oset! window-params "!left" (utils/parse-int left)))
  (if (some? top)
    (oset! window-params "!top" (utils/parse-int top)))
  (if (some? width)
    (oset! window-params "!width" (utils/parse-int width)))
  (if (some? height)
    (oset! window-params "!height" (utils/parse-int height)))
  window-params)

(defn get-window-id [window]
  (oget window "id"))

(defn fetch-window [window-id]
  (go
    (let [[window] (<! (windows/get window-id))]
      window)))

(defn create-window-and-wait-for-first-tab-completed! [window-params]
  (let [chrome-event-channel (make-chrome-event-channel (chan))]
    (tabs/tap-on-updated-events chrome-event-channel)
    (go
      (let [[window] (<! (windows/create window-params))
            tabs (oget window "tabs")
            tab-id (get-tab-id (first tabs))]
        (loop []
          (let [event (<! chrome-event-channel)
                [event-id event-args] event]
            (case event-id
              ::tabs/on-updated (let [[updated-tab-id change-info] event-args]
                                  (if (and (= (oget change-info "?status") "complete")
                                           (= tab-id updated-tab-id))
                                    (do
                                      (close! chrome-event-channel)
                                      [window tab-id])
                                    (recur)))
              (recur))))))))

; -- tab --------------------------------------------------------------------------------------------------------------------

(defn tab-exists? [tab-id]
  (go
    (with-muted-error-reporting
      (if-let [[tab] (<! (tabs/get tab-id))]
        true
        false))))

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
