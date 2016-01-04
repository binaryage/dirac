; initial version taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.implant.ws-client
  (:require-macros [dirac.implant.ws-client :refer [log warn info error]])
  (:require [clojure.browser.event :as event]
            [clojure.browser.net :as net]
            [cljs.reader :refer [read-string]]
            [dirac.implant.websocket :as ws]))

(def defaults {:name              "WebSocket Client"
               :verbose           true
               :auto-reconnect?   true
               :next-reconnect-fn (fn [_attempts] 10000)})                                                                    ; once every 10 seconds

; -- constructor ------------------------------------------------------------------------------------------------------------

(defn make-client [connection options]
  (atom {:ready?     false
         :connection connection
         :options    options}))

; -- state helpers ----------------------------------------------------------------------------------------------------------

(defn get-connection [client]
  (:connection @client))

(defn ready? [client]
  (:ready? @client))

(defn get-options [client]
  (:options @client))

(defn connected? [client]
  (not (nil? (get-connection client))))

(defn mark-as-not-ready! [client]
  (swap! client assoc :ready? false))

(defn mark-as-ready! [client]
  (swap! client assoc :ready? true))

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
      (net/transmit (get-connection client) serialized-msg))))

(defn send! [client msg]
  (cond
    (not (connected? client)) (warn client "Connection is not estabilished, dropping message" msg "client:" @client)          ; did you call connect! ?
    (not (ready? client)) (warn client "Client is not ready, dropping message" msg "client:" @client)                         ; channel is not open
    :else (really-send! client msg)))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn on-open-handler [client]
  (let [{:keys [verbose on-open]} (get-options client)]
    (mark-as-ready! client)
    (send! client {:op :ready})
    (if (and verbose (ready? client))
      (info client "Opened websocket connection"))
    (if on-open
      (on-open))))

(defn on-message-handler [client event]
  (let [{:keys [on-message verbose]} (get-options client)
        serialized-msg (.-message event)
        message (unserialize-message serialized-msg)]
    (if verbose
      (log client "Got websocket message" message))
    (if on-message
      (on-message message))))

(defn on-closed-handler [client]
  (let [{:keys [on-close verbose]} (get-options client)]
    (if (and verbose (ready? client))
      (info client "Closed websocket connection"))
    (if on-close
      (on-close))
    (mark-as-not-ready! client)))

(defn on-error-handler [client event]
  (let [{:keys [on-error verbose]} (get-options client)]
    (when (ready? client)
      (if verbose
        (error client "Encountered websocket error" event)))
    (if on-error
      (on-error event))))

(defn sanitize-opts [opts]
  (merge defaults opts))

(defn connect! [server-url & [opts]]
  (let [sanitized-opts (sanitize-opts opts)
        {:keys [verbose auto-reconnect? next-reconnect-fn]} sanitized-opts
        conn (ws/websocket-connection auto-reconnect? next-reconnect-fn)
        client (make-client conn sanitized-opts)]
    (event/listen conn :opened (partial on-open-handler client))
    (event/listen conn :message (partial on-message-handler client))
    (event/listen conn :closed (partial on-closed-handler client))
    (event/listen conn :error (partial on-error-handler client))
    (if verbose
      (info client "Connecting to server:" server-url "with options:" sanitized-opts))
    (net/connect conn server-url)
    client))