(ns dirac.background.debugger
  (:require-macros [cljs.core.async.macros :refer [go]])
  (:require [cljs-http.client :as http]
            [cljs.core.async :refer [<!]]))

(defn get-context-list-api-endpoint [debugger-url]
  (str debugger-url "/json"))

(defn fetch-context-list [debugger-url]
  (let [api-endpoint (get-context-list-api-endpoint debugger-url)]
    (go
      (let [response (<! (http/get api-endpoint))]
        (:body response)))))

(defn matching-contexts-by-url [context-list context-url]
  (filter #(= (:url %) context-url) context-list))

(defn extract-backend-url [devtools-frontend-url]
  (if-let [matches (re-matches #"/devtools/inspector.html\?ws=(.*)" devtools-frontend-url)]
    (second matches)))

(defn resolve-backend-url [debugger-url context-url]
  (go
    (if-let [context-list (<! (fetch-context-list debugger-url))]
      (if-let [context (first (matching-contexts-by-url context-list context-url))]
        (if-let [devtools-frontend-url (:devtoolsFrontendUrl context)]
          (extract-backend-url devtools-frontend-url)
          :not-attachable)))))
