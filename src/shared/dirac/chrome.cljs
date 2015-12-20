(ns dirac.chrome
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.windows :as windows]
            [dirac.utils :as utils]))

(defn get-tab [tab-id]
  (go
    (let [[tab] (<! (tabs/get tab-id))]
      tab)))

(defn get-tab-id [tab]
  (oget tab "id"))

(defn get-tab-url [tab]
  (oget tab "url"))

(defn get-tab-window-id [tab]
  (oget tab "windowId"))

(defn get-window [window-id]
  (go
    (let [[window] (<! (windows/get window-id))]
      window)))

(defn get-tab-window [tab]
  (get-window (get-tab-window-id tab)))

(defn lookup-tab-window-id [tab-id]
  (go
    (if-let [tab (<! (get-tab tab-id))]
      (get-tab-window-id tab))))

(defn lookup-tab-window [tab-id]
  (go
    (if-let [tab (<! (get-tab tab-id))]
      (get-tab-window tab))))