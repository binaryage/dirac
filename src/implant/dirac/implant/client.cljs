(ns dirac.implant.client
  (:require [chromex.logging :refer-macros [log warn error]]
            [cognitect.transit :as transit]))

(defonce socket-reader (transit/reader :json))
(defonce socket-writer (transit/writer :json))

; -- messaging --------------------------------------------------------------------------------------------------------------

(defn serialize-message [msg]
  (transit/write socket-writer msg))

(defn unserialize-message [payload]
  (transit/read socket-reader payload))

(defn send! [socket msg]
  (.send socket (serialize-message msg)))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-websocket-imp []
  (aget js/window "WebSocket"))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn on-message [handler connection-id data]
  (log "GOT MSG" data)
  (let [msg (unserialize-message (.-data data))]
    (handler {:id      connection-id
              :op      :message
              :payload msg})))

(defn on-open [handler connection-id]
  (log "ON-OPEN" connection-id)
  (handler {:id connection-id
            :op :open}))

(defn on-error [handler connection-id]
  (log "ON-ERROR" connection-id)
  (handler {:id connection-id
            :op :error}))

(defn connect [url connection-id handler]
  (when-let [WebSocket (get-websocket-imp)]
    (log "Dirac: trying to open repl-driver socket")
    (let [url (str url "/" connection-id)
          socket (WebSocket. url)]
      (set! (.-onmessage socket) #(on-message handler connection-id %))
      (set! (.-onopen socket) #(on-open handler connection-id))
      (set! (.-onerror socket) #(on-error handler connection-id))
      socket)))

(defn disconnect [socket]
  (.close socket))