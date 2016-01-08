(ns dirac.agent.nrepl-tunnel-server
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [dirac.agent.nrepl-protocols :as nrepl-protocols]
            [dirac.agent.ws-server :as ws-server]))

; -- constructor ------------------------------------------------------------------------------------------------------------

(defn make-server [tunnel]
  {:tunnel                  tunnel
   :ws-server               (atom nil)
   :client->session-promise (atom {})})

; -- access -----------------------------------------------------------------------------------------------------------------

(defn get-ws-server [server]
  {:pre  [server]
   :post [%]}
  @(:ws-server server))

(defn set-ws-server! [server ws-server]
  {:pre [server]}
  (reset! (:ws-server server) ws-server))

(defn get-tunnel [server]
  {:pre [server]}
  (let [tunnel (:tunnel server)]
    (assert tunnel "Tunnel not specified!")
    (assert (satisfies? nrepl-protocols/NREPLTunnelService tunnel) "Tunnel must satisfy NREPLTunnelService protocol")
    tunnel))

(defn get-client-for-session [server session]
  {:pre [server (string? session)]}
  (first (first (filter #(= session @(second %)) @(:client->session-promise server)))))                                       ; this may block until session promise gets delivered

(defn get-client-session [server client]
  {:post [(string? %)]}
  (println "get client session\n" client)
  @(get @(:client->session-promise server) client))

(defn set-client-session-promise! [server client session-promise]
  {:pre [server client session-promise]}
  (println "set client session" session-promise "\n" client)
  (swap! (:client->session-promise server) assoc client session-promise))

(defn remove-client! [server client]
  {:pre [server client]}
  (swap! (:client->session-promise server) dissoc client))

(defn get-clients [server]
  (keys @(:client->session-promise server)))

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [client message]
  {:pre [client]}
  (ws-server/send! client message))

(defn dispatch-message! [server message]
  (if-let [session (:session message)]                                                                                        ; ignore messages without session TODO: warn maybe?
    (if-let [client (get-client-for-session server session)]                                                                  ; client may be already disconnected
      ;(println "sending message " message " to server " server)
      (send! client message))))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message (fn [_server _client msg] (:op msg)))

(defmethod process-message :default [_server _client message]
  (println "Received unrecognized message from tunnel client" message))

(defmethod process-message :ready [server client _message]
  (println "got ready!")
  ; a new client is ready after connection
  ; ask him to bootstrap nREPL environment
  (let [session (get-client-session server client)]
    (send! client {:op      :bootstrap
                   :session session})))

(defmethod process-message :init-done [_server _client _message])

(defmethod process-message :error [_server _client message]
  (println "DevTools reported error" message))

(defmethod process-message :nrepl-message [server client message]
  (if-let [envelope (:envelope message)]
    (let [tunnel (get-tunnel server)
          session (get-client-session server client)
          envelope-with-session (assoc envelope :session session)]
      (nrepl-protocols/deliver-message-to-server! tunnel envelope-with-session))))

; -- utilities --------------------------------------------------------------------------------------------------------------

(defn make-cljs-quit-message [session]
  {:op      "eval"
   :session session
   :code    ":cljs/quit"})

(defn quit-client! [server client]
  (let [tunnel (get-tunnel server)
        session (get-client-session server client)]
    @(nrepl-protocols/deliver-message-to-server! tunnel (make-cljs-quit-message session))))                                   ; blocks until delivered

(defn disconnect-client! [server client]
  (let [tunnel (get-tunnel server)
        session (get-client-session server client)]
    (quit-client! server client)
    (nrepl-protocols/close-session tunnel session)
    (remove-client! server session)))

(defn disconnect-all-clients! [server]
  (let [clients (get-clients server)]
    (doseq [client clients]
      (disconnect-client! server client))))

(defn open-client-session [server client]
  (let [session-promise (promise)]
    (set-client-session-promise! server client session-promise)
    (let [tunnel (get-tunnel server)
          session (nrepl-protocols/open-session tunnel)]                                                                      ; blocking!
      (deliver session-promise session)
      (println "new client initialized" session))))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn on-message [server _ws-server client message]
  (process-message server client message))

(defn on-incoming-client [server _ws-server client]
  (println "new client connected to tunnel" client)
  (open-client-session server client))

(defn on-leaving-client [server _ws-server client]
  (println "client disconnected from tunnel" client)
  (disconnect-client! server client))

(defn start! [tunnel options]
  (let [server (make-server tunnel)
        server-options (assoc options
                         :on-message (partial on-message server)
                         :on-incoming-client (partial on-incoming-client server)
                         :on-leaving-client (partial on-leaving-client server))]
    (set-ws-server! server (ws-server/start! server-options))
    (let [ws-server (get-ws-server server)
          ip (ws-server/get-ip ws-server)
          port (ws-server/get-local-port ws-server)]
      (println (str "Started Dirac nREPL tunnel server on ws://" ip ":" port))
      server)))

(defn stop! [server]
  (disconnect-all-clients! server)
  (ws-server/stop! (get-ws-server server)))