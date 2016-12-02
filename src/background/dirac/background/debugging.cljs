(ns dirac.background.debugging
  (:require-macros [cljs.core.async.macros :refer [go]]
                   [dirac.background.logging :refer [log info warn error]])
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

(defn select-matching-context-by-url [context-list context-url]
  (let [matching-contexts (filter #(= (:url %) context-url) context-list)]
    (log "matching contexts:" matching-contexts)
    (case (count matching-contexts)
      0 (make-failure (str "no matching context found for context-url=" context-url "\ncontext-list=" context-list))
      1 (first matching-contexts)
      (make-failure (str "unexpected, multiple contexts matched context-url=" context-url
                         "\nmatching-contexts=" matching-contexts)))))

(defn extract-backend-url [devtools-frontend-url]
  (if-let [matches (re-matches #"/devtools/inspector.html\?ws=(.*)" devtools-frontend-url)]
    (second matches)
    (make-failure (str "unexpected failure to extract ws from devtools-frontend-url=" devtools-frontend-url))))

(defn try-resolve-backend-url [debugger-url context-url]
  (go
    (let [context-list (<! (fetch-context-list debugger-url))]
      (if (resolution-failure? context-list)
        context-list
        (let [context (select-matching-context-by-url context-list context-url)]
          (if (resolution-failure? context)
            context
            (if-let [devtools-frontend-url (:devtoolsFrontendUrl context)]
              (extract-backend-url devtools-frontend-url)
              :not-attachable)))))))

; -- main API ---------------------------------------------------------------------------------------------------------------

(defn resolve-backend-url [debugger-url context-url]
  (go
    (log (str "resolving backend-url for debugger-url=" debugger-url " context-url=" context-url))
    (loop [attempt 0]
      (let [backend-url-or-failure (<! (try-resolve-backend-url debugger-url context-url))]
        (if (or (not (resolution-failure? backend-url-or-failure))
                (>= attempt (get-backend-url-resolution-trials)))
          backend-url-or-failure
          (do
            (<! (timeout (get-failed-backend-url-resolution-delay)))
            (recur (inc attempt))))))))
