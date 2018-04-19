(ns dirac.background.debugging
  (:require [cljs-http.client :as http]
            [dirac.background.logging :refer [error info log warn]]
            [dirac.settings :refer [get-backend-url-resolution-trials
                                    get-failed-backend-url-resolution-delay]]
            [dirac.shared.async :refer [<! go go-wait]]
            [oops.core :refer [oget]]))

; -- messages ---------------------------------------------------------------------------------------------------------------

(defn make-nil-response-from-api-msg [api-endpoint]
  (str "nil response from api-endpoint=" api-endpoint))

(defn make-empty-body-response-msg [api-endpoint]
  (str "empty body response from api-endpoint=" api-endpoint))

(defn make-no-matching-context-found-msg [context-url context-list]
  (str "no matching context found for context-url=" context-url "\ncontext-list=" context-list))

(defn make-multiple-contexts-matched-msg [context-url matching-contexts]
  (str "unexpected, multiple contexts matched context-url=" context-url "\nmatching-contexts=" matching-contexts))

(defn make-multiple-node-contexts-matched-msg [matching-contexts]
  (str "unexpected, multiple node contexts matched\nmatching-contexts=" matching-contexts))

(defn make-failure-to-extract-ws-msg [devtools-frontend-url]
  (str "unexpected failure to extract ws from devtools-frontend-url=" devtools-frontend-url))

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

(defn go-fetch-context-list [debugger-url]
  (go
    (let [api-endpoint (get-context-list-api-endpoint debugger-url)
          response (<! (http/get api-endpoint))]
      (cond
        (nil? response) (make-failure (make-nil-response-from-api-msg api-endpoint))
        (empty? (:body response)) (make-failure (make-empty-body-response-msg api-endpoint))
        :else (:body response)))))

(defn node-context? [context]
  (= (:type context) "node"))

(defn select-node-context [context-list]
  (let [node-contexts (filter node-context? context-list)]
    (case (count node-contexts)
      0 nil
      1 (first node-contexts)
      (make-failure (make-multiple-node-contexts-matched-msg node-contexts)))))

(defn select-matching-context-by-url [context-list context-url]
  (let [matching-contexts (filter #(= (:url %) context-url) context-list)]
    (case (count matching-contexts)
      0 (or (select-node-context context-list)
            (make-failure (make-no-matching-context-found-msg context-url context-list)))
      1 (first matching-contexts)
      (make-failure (make-multiple-contexts-matched-msg context-url matching-contexts)))))

(defn extract-backend-url [devtools-frontend-url]
  (if-let [matches (re-find #"[?&]ws=([^&]*)" devtools-frontend-url)]
    (second matches)
    (make-failure (make-failure-to-extract-ws-msg devtools-frontend-url))))

(defn go-try-resolve-backend-info [debugger-url context-url]
  (go
    (let [context-list (<! (go-fetch-context-list debugger-url))]
      (if (resolution-failure? context-list)
        context-list
        (let [context (select-matching-context-by-url context-list context-url)]
          (if (resolution-failure? context)
            context
            (if-let [devtools-frontend-url (:devtoolsFrontendUrl context)]
              {:url  (extract-backend-url devtools-frontend-url)
               :type (if (node-context? context) :node :browser)}
              :not-attachable)))))))

; -- main API ---------------------------------------------------------------------------------------------------------------

(defn go-resolve-backend-info [debugger-url context-url]
  (go
    (log (str "resolving backend-url for debugger-url=" debugger-url " context-url=" context-url))
    (loop [attempt 0]
      (let [backend-url-or-failure (<! (go-try-resolve-backend-info debugger-url context-url))]
        (if (or (not (resolution-failure? backend-url-or-failure))
                (>= attempt (get-backend-url-resolution-trials)))
          backend-url-or-failure
          (do
            (<! (go-wait (get-failed-backend-url-resolution-delay)))
            (recur (inc attempt))))))))
