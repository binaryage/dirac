(ns dirac.automation.transcript-streamer
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan sliding-buffer put! timeout]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.lib.ws-client :as ws-client]))

(defonce current-client (atom nil))
(defonce transcript-stream (chan (sliding-buffer 1024)))

(defn publish! [text style]
  (put! transcript-stream {:op    :publish
                           :text  text
                           :style style}))

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [msg]
  (if-let [client @current-client]
    (ws-client/send! client msg)
    (throw (ex-info "No client!" msg))))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message :op)

(defmethod process-message :error [message]
  (throw (ex-info "Received error message" message))
  (go
    {:op      :error
     :message (:type message)}))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn run-streaming-loop! []
  (log "transcript-streamer: entering streaming loop...")
  (go-loop []
    (when-let [msg (<! transcript-stream)]
      (send! msg)
      (recur))
    (log "transcript-streamer: leaving streaming loop...")))

(defn on-message-handler [_client message]
  (go
    (if-let [result (<! (process-message message))]
      (send! result))))

(defn on-open-handler [client]
  (run-streaming-loop!))

(defn connect! [server-url opts]
  (log (str "transcript-streamer: connecting " server-url))
  (let [default-opts {:name       "Transcript Streamer (client)"
                      :on-message on-message-handler
                      :on-open    on-open-handler}
        effective-opts (merge default-opts opts)
        client (ws-client/connect! server-url effective-opts)]
    (reset! current-client client)))

(defn disconnect! []
  (when-let [client @current-client]
    (ws-client/close! client)
    true))

(defn init! [server-url & [opts]]
  (if (some? server-url)
    (connect! server-url opts)))
