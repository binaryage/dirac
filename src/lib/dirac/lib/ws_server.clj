; taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.lib.ws-server
  (:require [org.httpkit.server :as http]
            [clojure.tools.logging :as log]
            [dirac.lib.utils :as utils])
  (:import (java.net BindException)))

(defrecord WebSocketServer [id options http-server first-client-promise clients]
  Object
  (toString [this]
    (str "[WebSocketServer#" (:id this) "]")))

; -- WebSocketServer construction -------------------------------------------------------------------------------------------

(def last-id (volatile! 0))

(defn next-id! []
  (vswap! last-id inc))

(defn make-server! [options]
  (let [server (WebSocketServer. (next-id!) options (atom nil) (atom (promise)) (atom []))]
    (log/trace "Made" (str server))
    server))

; -- WebSocketServer getters/setters ----------------------------------------------------------------------------------------

(defn get-http-server [server]
  {:pre  [(instance? WebSocketServer server)]
   :post [%]}
  @(:http-server server))

(defn set-http-server! [server http-server]
  {:pre [(instance? WebSocketServer server)]}
  (reset! (:http-server server) http-server))

(defn get-options [server]
  {:pre  [(instance? WebSocketServer server)]
   :post [%]}
  (:options server))

(defn get-first-client-promise [server]
  {:pre [(instance? WebSocketServer server)]}
  @(:first-client-promise server))

(defn swap-first-client-promise! [server new-promise]
  {:pre [(instance? WebSocketServer server)]}
  (swap! (:first-client-promise server) new-promise))

(defn get-clients [server]
  {:pre [(instance? WebSocketServer server)]}
  @(:clients server))

(defn add-client! [server client]
  {:pre [(instance? WebSocketServer server)]}
  (swap! (:clients server) conj client)
  (let [first-client-promise (get-first-client-promise server)]
    (if-not (realized? first-client-promise)
      (deliver first-client-promise client))))

(defn has-clients? [server]
  {:pre [(instance? WebSocketServer server)]}
  (not (empty? @(:clients server))))

(defn remove-client! [server client]
  {:pre [(instance? WebSocketServer server)]}
  (swap! (:clients server) (fn [clients] (remove #{client} clients)))
  (if-not (has-clients? server)
    (swap-first-client-promise! server (promise))))

(defn get-local-port [server]
  {:pre [(instance? WebSocketServer server)]}
  (-> (get-http-server server) meta :local-port))                                                                             ; this is an implementation detail of http-kit

(defn get-host [server]
  {:pre [(instance? WebSocketServer server)]}
  (:host (get-options server)))

(defn get-url [server]
  {:pre [(instance? WebSocketServer server)]}
  (let [host (get-host server)
        port (get-local-port server)]
    (utils/get-ws-url host port)))

; -- client data ------------------------------------------------------------------------------------------------------------

(defrecord WebSocketServerClient [id channel ready-promise]
  Object
  (toString [this]
    (str "[WebSocketServerClient#" (:id this) "]")))

; -- WebSocketServerClient construction -------------------------------------------------------------------------------------

(def last-client-id (volatile! 0))

(defn next-client-id! []
  (vswap! last-client-id inc))

(defn make-client [channel]
  (let [client (WebSocketServerClient. (next-client-id!) channel (promise))]
    (log/trace "Made" (str client))
    client))

; -- WebSocketServerClient accees -------------------------------------------------------------------------------------------

(defn get-channel [client]
  {:pre [(instance? WebSocketServerClient client)]}
  (:channel client))

(defn get-ready-promise [client]
  {:pre [(instance? WebSocketServerClient client)]}
  (:ready-promise client))

; http server is multithreaded and we can potentially enter handlers before accept-client finishes
; this is a guard to wait for full client initialization after executing potentially long running on-incoming-client
(defn wait-for-client-to-be-ready [client]
  {:pre [(instance? WebSocketServerClient client)]}
  @(get-ready-promise client))

; -- serialization  ---------------------------------------------------------------------------------------------------------
; TODO: make serialization pluggable

(defn serialize-msg [msg]
  (pr-str msg))

(defn unserialize-msg [unserialized-msg]
  (read-string unserialized-msg))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn on-close [server client status]
  (wait-for-client-to-be-ready client)
  (let [{:keys [on-client-disconnection on-leaving-client]} (get-options server)]
    (if on-client-disconnection
      (on-client-disconnection server client status))
    (if on-leaving-client
      (on-leaving-client server client))
    (remove-client! server client)))

(defn on-receive [server client serialized-msg]
  (wait-for-client-to-be-ready client)
  (let [{:keys [on-receive on-message]} (get-options server)]
    (if on-receive
      (on-receive server client serialized-msg))
    (if on-message
      (let [msg (unserialize-msg serialized-msg)]
        (on-message server client msg)))))

(defn accept-client [server channel]
  (let [client (make-client channel)
        {:keys [on-incoming-client]} (get-options server)]
    (add-client! server client)
    (http/on-close channel (partial on-close server client))
    (http/on-receive channel (partial on-receive server client))
    (if on-incoming-client
      (on-incoming-client server client))
    (deliver (get-ready-promise client) true)))

(defn on-new-client-connection [server request]
  (http/with-channel request channel
    (if-not (http/websocket? channel)
      {:status 200 :body "Please connect with a websocket client!"}
      (let [{:keys [on-client-connection]} (get-options server)
            accepted? (or (not on-client-connection) (not= :rejected (on-client-connection server channel)))]
        (if accepted?
          (accept-client server channel))))))

; -- sending ----------------------------------------------------------------------------------------------------------------

(defn send! [client msg]
  (let [serialized-msg (serialize-msg msg)
        channel (get-channel client)]
    (http/send! channel serialized-msg)))

; -- closing client connection ----------------------------------------------------------------------------------------------

(defn close! [client]
  (log/trace (str client) "Closing client connection")
  (let [channel (get-channel client)]
    (http/close channel)))

; -- life cycle -------------------------------------------------------------------------------------------------------------

(defn sanitize-options [options]
  ; :host is an alias for :ip (for convenience)
  (if (and (:host options) (not (:ip options)))
    (assoc options :ip (:host options))
    options))

(defn create!
  "Creates a new web-socket server, starts it and returns it.

  Options:
    :host an ip/host where to bind the server
    :port where to bind the server
    :port-range can be specified in options to try higher ports if :port happens to be taken.

  Returned server object can be used for subsequent destroy! and wait-for-first-client calls."
  [options]
  (let [options (sanitize-options options)
        port-range (or (:port-range options) 1)
        first-port (:port options)
        last-port-to-try (+ first-port port-range -1)]
    (loop [port first-port]
      (let [effective-options (assoc options :port port)
            server (make-server! options)
            connection-handler (partial on-new-client-connection server)
            http-server (try
                          (http/run-server connection-handler effective-options)
                          (catch BindException e
                            (if (= port last-port-to-try)
                              (throw e))))]
        (if-not http-server
          (recur (inc port))
          (do
            (set-http-server! server http-server)
            (log/debug "Created" (str server))
            server))))))

(defn destroy! [server & [timeout]]
  (log/trace "Destroying" (str server))
  (doseq [client (get-clients server)]
    (close! client))
  (when-let [http-server (get-http-server server)]
    (http-server :timeout (or timeout 100))                                                                                   ; this will stop the http-server created via http/run-server
    (set-http-server! server nil))
  (log/debug "Destroyed" (str server)))

(defn wait-for-first-client [server]
  (log/debug (str server) "Waiting for first client...")
  @(get-first-client-promise server)                                                                                          ; <== will block!
  (log/debug (str server) "First client connected")
  nil)