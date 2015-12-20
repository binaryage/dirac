(ns dirac.target.core
  (:require-macros [cljs.core.async.macros :refer [go]])
  (:require [cljs-http.client :as http]
            [cljs.core.async :refer [<!]]
            [chromex.logging :refer-macros [log info warn error group group-end]]))

(defn get-target-context-list-api-endpoint [target-url]
  (str target-url "/json"))

(defn fetch-target-context-list [target-url]
  (let [api-endpoint (get-target-context-list-api-endpoint target-url)]
    (go
      (let [response (<! (http/get api-endpoint))]
        (:body response)))))

(defn matching-contexts-by-url [context-list context-url]
  (filter #(= (:url %) context-url) context-list))

(defn extract-backend-url [devtools-frontend-url]
  (if-let [matches (re-matches #"/devtools/inspector.html\?ws=(.*)" devtools-frontend-url)]
    (second matches)))

(defn resolve-backend-url [target-url context-url]
  (go
    (if-let [context-list (<! (fetch-target-context-list target-url))]
      (if-let [context (first (matching-contexts-by-url context-list context-url))]
        (if-let [devtools-frontend-url (:devtoolsFrontendUrl context)]
          (extract-backend-url devtools-frontend-url)
          :not-attachable)))))