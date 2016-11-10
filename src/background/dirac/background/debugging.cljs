(ns dirac.background.debugging
  (:require-macros [cljs.core.async.macros :refer [go]])
  (:require [cljs-http.client :as http]
            [cljs.core.async :refer [<! timeout]]
            [dirac.settings :refer [get-backend-url-resolution-trials
                                    get-failed-backend-url-resolution-delay]]))

; -- failure handling -------------------------------------------------------------------------------------------------------

(deftype ResolutionFailure [reason])

(defn resolution-failure? [v]
  (instance? ResolutionFailure v))

(defn get-resolution-failure-reason [failure]
  (.-reason failure))

(defn make-failure [reason]
  (ResolutionFailure. reason))

; -- backend URL resolution -------------------------------------------------------------------------------------------------

; backend-url is a tab-specific debugging url devtools should connect to (Chrome Debugger Protocol endpoint)
; debugger-url is a debugging API provided by a chrome instance, used for listing all available backend urls

(defn get-context-list-api-endpoint [debugger-url]
  (str debugger-url "/json"))

(defn fetch-context-list [debugger-url]
  (let [api-endpoint (get-context-list-api-endpoint debugger-url)]
    (go
      (let [response (<! (http/get api-endpoint))]
        (cond
          (nil? response) (make-failure (str "nil response from api-endpoint=" api-endpoint))
          (empty? (:body response)) (make-failure (str "empty body response from api-endpoint=" api-endpoint))
          :else (:body response))))))

(defn matching-contexts-by-url [context-list context-url]
  (filter #(= (:url %) context-url) context-list))

(defn extract-backend-url [devtools-frontend-url]
  (if-let [matches (re-matches #"/devtools/inspector.html\?ws=(.*)" devtools-frontend-url)]
    (second matches)
    (make-failure (str "unexpected failure to extract ws from devtools-frontend-url=" devtools-frontend-url))))

(defn try-resolve-backend-url [debugger-url context-url]
  (go
    (let [context-list (<! (fetch-context-list debugger-url))]
      (if (resolution-failure? context-list)
        context-list
        (if-let [context (first (matching-contexts-by-url context-list context-url))]
          (if-let [devtools-frontend-url (:devtoolsFrontendUrl context)]
            (extract-backend-url devtools-frontend-url)
            :not-attachable)
          (make-failure (str "no matching context found for context-url=" context-url "\ncontext-list=" context-list)))))))

; -- main API ---------------------------------------------------------------------------------------------------------------

(defn resolve-backend-url [debugger-url context-url]
  (go
    (loop [attempt 0]
      (let [backend-url-or-failure (<! (try-resolve-backend-url debugger-url context-url))]
        (if (or (not (resolution-failure? backend-url-or-failure))
                (>= attempt (get-backend-url-resolution-trials)))
          backend-url-or-failure
          (do
            (<! (timeout (get-failed-backend-url-resolution-delay)))
            (recur (inc attempt))))))))
