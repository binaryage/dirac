(ns dirac.automation.transcript-streamer
  (:require [dirac.automation.logging :refer [error info log warn]]
            [dirac.shared.ws-client :as ws-client]
            [dirac.shared.async :refer [<! go go-channel put! sliding-buffer]]))

(defonce current-client (atom nil))
(defonce transcript-stream (go-channel (sliding-buffer 1024)))

(defn publish! [text style]
  (put! transcript-stream {:op    :publish
                           :text  text
                           :style style}))

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [msg]
  (if-some [client @current-client]
    (ws-client/send! client msg)
    (throw (ex-info "No client!" msg))))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti go-process-message :op)

(defmethod go-process-message :error [message]
  (throw (ex-info "Received error message" message))
  (go
    {:op      :error
     :message (:type message)}))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn go-run-streaming-loop! []
  (go
    (log "transcript-streamer: entering streaming loop...")
    (loop []
      (when-let [msg (<! transcript-stream)]
        (send! msg)
        (recur)))
    (log "transcript-streamer: leaving streaming loop...")))

(defn go-handle-message! [_client message]
  (go
    (when-some [result (<! (go-process-message message))]
      (send! result))))

(defn go-handle-open! [_client]
  (go-run-streaming-loop!))

(defn connect! [server-url opts]
  (log (str "transcript-streamer: connecting " server-url))
  (let [default-opts {:name       "Transcript Streamer (client)"
                      :on-message go-handle-message!
                      :on-open    go-handle-open!}
        effective-opts (merge default-opts opts)
        client (ws-client/connect! server-url effective-opts)]
    (reset! current-client client)))

(defn disconnect! []
  (when-let [client @current-client]
    (ws-client/close! client)
    true))

(defn init! [server-url & [opts]]
  (when (some? server-url)
    (connect! server-url opts)))
