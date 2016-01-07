; taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.agent.ws-server
  (:require [org.httpkit.server :as http])
  (:import (java.net BindException)))

; in following methods `server` is an atom holding server state
; new server instances can be created via `start!` function

; -- server state helpers ---------------------------------------------------------------------------------------------------

(defn make-server [http-server options]
  (atom {:http-server          http-server
         :options              options
         :first-client-promise (promise)
         :clients              []}))

(defn make-client [channel]
  {:channel channel})

(defn get-http-server [server]
  (:http-server @server))

(defn get-options [server]
  (:options @server))

(defn get-first-client-promise [server]
  (:first-client-promise @server))

(defn reset-first-client-promise! [server new-promise]
  (swap! server update :first-client-promise new-promise))

(defn add-client! [server client]
  (swap! server update :clients conj client)
  (let [first-client-promise (get-first-client-promise server)]
    (if-not (realized? first-client-promise)
      (deliver first-client-promise client))))

(defn has-clients? [server]
  (not (empty? (:clients @server))))

(defn remove-client! [server client]
  (swap! server update :clients (fn [clients] (remove #{client} clients)))
  (if-not (has-clients? server)
    (reset-first-client-promise! server (promise))))

(defn get-channel [client]
  (:channel client))

; -- serialization  ---------------------------------------------------------------------------------------------------------

(defn serialize-msg [msg]
  (pr-str msg))

(defn unserialize-msg [unserialized-msg]
  (read-string unserialized-msg))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn on-close [server client status]
  (let [{:keys [on-client-disconnection on-leaving-client]} (get-options server)]
    (if on-client-disconnection
      (on-client-disconnection server client status))
    (if on-leaving-client
      (on-leaving-client server client))
    (remove-client! server client)))

(defn on-receive [server client serialized-msg]
  (let [{:keys [on-receive on-message]} (get-options server)]
    (if on-receive
      (on-receive server client serialized-msg))
    (if on-message
      (let [msg (unserialize-msg serialized-msg)]
        (on-message server client msg)))))

(defn accept-client [server channel]
  ; TODO: do also some on-error handling?
  (let [client (make-client channel)
        {:keys [on-incoming-client]} (get-options server)]
    (add-client! server client)
    (http/on-close channel (partial on-close server client))
    (http/on-receive channel (partial on-receive server client))
    (if on-incoming-client
      (on-incoming-client server client))))

(defn client-connection-handler
  "Handler gets called for every new client connection."
  [server request]
  (http/with-channel request channel
    (if-not (http/websocket? channel)
      {:status 200 :body "Please connect with a websocket!"}
      (let [{:keys [on-client-connection]} (get-options server)
            accept? (or (not on-client-connection) (on-client-connection server channel))]
        (if accept?
          (accept-client server channel))))))

; -- sending ----------------------------------------------------------------------------------------------------------------

(defn send! [client msg]
  (let [serialized-msg (serialize-msg msg)
        channel (get-channel client)]
    (http/send! channel serialized-msg)))

; -- life cycle -------------------------------------------------------------------------------------------------------------

(defn start!
  "Starts a new server and returns atom holding server state.
  This server atom can be used for subsequent stop!, send! or wait-for-client calls."
  [options]
  (let [server (atom nil)
        connection-handler (partial client-connection-handler server)
        port-range (or (:port-range options) 1)
        first-port (:port options)
        last-port (+ first-port port-range -1)]
    (loop [port first-port]
      (let [effective-options (assoc options :port port)
            http-server (try
                          (http/run-server connection-handler effective-options)
                          (catch BindException e
                            (if (= port last-port)
                              (throw e))))]
        (if-not http-server
          (recur (inc port))
          (do
            (reset! server @(make-server http-server effective-options))
            server))))))

(defn stop! [server & [timeout]]
  (when-let [http-server (get-http-server server)]
    (http-server :timeout (or timeout 100))                                                                                   ; this will stop http-server created via http/run-server
    (reset! server nil)))

(defn wait-for-first-client [server]
  @(get-first-client-promise server)                                                                                          ; <== will block!
  nil)