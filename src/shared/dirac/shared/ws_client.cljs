; initial version taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.shared.ws-client
  (:require [cljs.reader :refer [read-string]]
            [dirac.shared.logging :refer [error info log warn]]
            [goog.net.WebSocket :as goog-ws]))

(def defaults {:name              "WebSocket Client"
               :verbose?          false
               :init-delay        500                                                                                         ; see https://github.com/http-kit/http-kit/issues/318
               :auto-reconnect?   false
               :next-reconnect-fn (fn [_attempt] (* 10 1000))})

; -- constructor ------------------------------------------------------------------------------------------------------------

(defn make-client [connection server-url options]
  {:ready?     (volatile! false)
   :connection connection
   :server-url server-url
   :options    options})

; -- state helpers ----------------------------------------------------------------------------------------------------------

(defn get-connection [client]
  (:connection client))

(defn get-server-url [client]
  (:server-url client))

(defn ready? [client]
  @(:ready? client))

(defn get-options [client]
  (:options client))

(defn connected? [client]
  (.isOpen (get-connection client)))

(defn mark-as-not-ready! [client]
  (vreset! (:ready? client) false))

(defn mark-as-ready! [client]
  (vreset! (:ready? client) true))

; -- message serialization --------------------------------------------------------------------------------------------------

(defn serialize-message [msg]
  (try
    (pr-str msg)
    (catch :default e
      (error (str "Unable to serialize message: " (.-message e) "\n") msg))))

(defn unserialize-message [serialized-msg]
  (try
    (read-string serialized-msg)
    (catch :default e
      (error (str "Unable to unserialize message: " (.-message e) "\n") serialized-msg))))

; -- sending ----------------------------------------------------------------------------------------------------------------

(defn really-send! [client msg]
  (let [{:keys [verbose?]} (get-options client)]
    (when verbose?
      (log client "Sending websocket message" msg))
    (let [serialized-msg (serialize-message msg)]
      (.send (get-connection client) serialized-msg))))

(defn send! [client msg]
  (cond
    (not (connected? client)) (warn client "Connection is not estabilished, dropping message" msg "client:" client)           ; did you call connect! ?
    (not (ready? client)) (warn client "Client is not ready, dropping message" msg "client:" client)                          ; channel is not open
    :else (really-send! client msg)))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn handle-open! [client]
  (let [{:keys [verbose? on-open]} (get-options client)]
    (mark-as-ready! client)
    (when (and verbose? (ready? client))
      (info client "Opened websocket connection"))
    (send! client (merge {:op :ready} (:ready-msg (get-options client))))
    (when (some? on-open)
      (on-open client))))

(defn handle-message! [client event]
  (let [{:keys [on-message verbose?]} (get-options client)
        serialized-msg (.-message event)
        message (unserialize-message serialized-msg)]
    (when verbose?
      (log client "Received websocket message" message))
    (when (some? on-message)
      (on-message client message))))

(defn handle-close! [client]
  (let [{:keys [on-close verbose?]} (get-options client)]
    (when (and verbose? (ready? client))
      (info client "Closed websocket connection"))
    (when (some? on-close)
      (on-close client))
    (mark-as-not-ready! client)))

(defn handle-error! [client event]
  (let [{:keys [on-error verbose?]} (get-options client)]
    (when (ready? client)
      (when verbose?
        (error client "Encountered websocket error" event)))
    (when (some? on-error)
      (on-error client event))))

(defn sanitize-opts [opts]
  (merge defaults opts))

(defn try-connect! [client]
  (if-not (connected? client)
    (let [server-url (get-server-url client)
          options (get-options client)]
      (when (:verbose? options)
        (info client "Connecting to server:" server-url "with options:" options))
      (.open (get-connection client) server-url))
    true))

(defn make-delayed-fn [f delay]
  (if (some? delay)
    (fn [& args]
      (js/setTimeout #(apply f args) delay))
    f))

(defn connect! [server-url & [opts]]
  (let [sanitized-opts (sanitize-opts opts)
        {:keys [auto-reconnect? next-reconnect-fn init-delay]} sanitized-opts
        web-socket (goog.net.WebSocket. auto-reconnect? next-reconnect-fn)
        client (make-client web-socket server-url sanitized-opts)]
    (.listen web-socket goog-ws/EventType.OPENED (make-delayed-fn (partial handle-open! client) init-delay))
    (.listen web-socket goog-ws/EventType.MESSAGE (partial handle-message! client))
    (.listen web-socket goog-ws/EventType.CLOSED (partial handle-close! client))
    (.listen web-socket goog-ws/EventType.ERROR (partial handle-error! client))
    (try-connect! client)
    client))

(defn close! [client]
  (when (connected? client)
    (.close (get-connection client))
    true))
