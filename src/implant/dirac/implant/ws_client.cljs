; initial version taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.implant.ws-client
  (:require-macros [dirac.implant.ws-client :refer [log warn info error]])
  (:require [cljs.reader :refer [read-string]]
            [goog.net.WebSocket :as gws]))

(def defaults {:name              "WebSocket Client"
               :verbose           false
               :auto-reconnect?   false
               :next-reconnect-fn (fn [_attempt] (* 10 1000))})

; -- constructor ------------------------------------------------------------------------------------------------------------

(defn make-client [connection options]
  {:ready?     (volatile! false)
   :connection connection
   :options    options})

; -- state helpers ----------------------------------------------------------------------------------------------------------

(defn get-connection [client]
  (:connection client))

(defn ready? [client]
  @(:ready? client))

(defn get-options [client]
  (:options client))

(defn connected? [client]
  (not (nil? (get-connection client))))

(defn mark-as-not-ready! [client]
  (vreset! (:ready? client) false))

(defn mark-as-ready! [client]
  (vreset! (:ready? client) true))

; -- message serialization --------------------------------------------------------------------------------------------------

(defn serialize-message [msg]
  (pr-str msg))

(defn unserialize-message [unserialized-msg]
  (read-string unserialized-msg))

; -- sending ----------------------------------------------------------------------------------------------------------------

(defn really-send! [client msg]
  (let [{:keys [verbose]} (get-options client)]
    (if verbose
      (log client "Sending websocket message" msg))
    (let [serialized-msg (serialize-message msg)]
      (.send (get-connection client) serialized-msg))))

(defn send! [client msg]
  (cond
    (not (connected? client)) (warn client "Connection is not estabilished, dropping message" msg "client:" client)           ; did you call connect! ?
    (not (ready? client)) (warn client "Client is not ready, dropping message" msg "client:" client)                          ; channel is not open
    :else (really-send! client msg)))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn on-open-handler [client]
  (let [{:keys [verbose on-open]} (get-options client)]
    (mark-as-ready! client)
    (if (and verbose (ready? client))
      (info client "Opened websocket connection"))
    (send! client {:op :ready})
    (if on-open
      (on-open client))))

(defn on-message-handler [client event]
  (let [{:keys [on-message verbose]} (get-options client)
        serialized-msg (.-message event)
        message (unserialize-message serialized-msg)]
    (if verbose
      (log client "Received websocket message" message))
    (if on-message
      (on-message client message))))

(defn on-closed-handler [client]
  (let [{:keys [on-close verbose]} (get-options client)]
    (if (and verbose (ready? client))
      (info client "Closed websocket connection"))
    (if on-close
      (on-close client))
    (mark-as-not-ready! client)))

(defn on-error-handler [client event]
  (let [{:keys [on-error verbose]} (get-options client)]
    (when (ready? client)
      (if verbose
        (error client "Encountered websocket error" event)))
    (if on-error
      (on-error client event))))

(defn sanitize-opts [opts]
  (merge defaults opts))

(defn connect! [server-url & [opts]]
  (let [sanitized-opts (sanitize-opts opts)
        {:keys [verbose auto-reconnect? next-reconnect-fn]} sanitized-opts
        web-socket (goog.net.WebSocket. auto-reconnect? next-reconnect-fn)
        client (make-client web-socket sanitized-opts)]
    (.listen web-socket gws/EventType.OPENED (partial on-open-handler client))
    (.listen web-socket gws/EventType.MESSAGE (partial on-message-handler client))
    (.listen web-socket gws/EventType.CLOSED (partial on-closed-handler client))
    (.listen web-socket gws/EventType.ERROR (partial on-error-handler client))
    (if verbose
      (info client "Connecting to server:" server-url "with options:" sanitized-opts))
    (.open web-socket server-url)
    client))