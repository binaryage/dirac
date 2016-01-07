(ns dirac.agent.nrepl-tunnel-server
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [dirac.agent.nrepl-protocols :as nrepl-protocols]
            [dirac.agent.ws-server :as server]))

(def default-opts {:ip   "127.0.0.1"
                   :port 9001})

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-tunnel [server]
  (let [tunnel (:tunnel (meta server))]
    (assert tunnel "Tunnel not specified!")
    (assert (satisfies? nrepl-protocols/NREPLTunnelService tunnel) "Tunnel must satisfy NREPLTunnelService protocol")
    tunnel))

(defn get-client-session [server client]
  {:post [% (string? %)]}
  (let [session->clients (get (meta server) :client-sessions)]
    (first (first (filter #(= (second %) client) session->clients)))))

(defn set-client-session! [server client session]
  {:pre [server client session (string? session)]}
  (alter-meta! server update :client-sessions assoc session client))

(defn remove-client-session! [server session]
  {:pre [server session (string? session)]}
  (alter-meta! server update :client-sessions dissoc session))

(defn get-client-for-session [server session]
  {:pre [server session (string? session)]}
  (get-in (meta server) [:client-sessions session]))

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [client message]
  {:pre [client]}
  (server/send! client message))

(defn dispatch-message! [server message]
  (if-let [session (:session message)]                                                                                        ; ignore messages without session
    (if-let [client (get-client-for-session server session)]                                                                  ; client may be already disconnected
      ;(println "sending message " message " to server " server)
      (send! client message))))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message (fn [_server _client msg] (:op msg)))

(defmethod process-message :default [_server _client message]
  (println "Received unrecognized message from tunnel client" message))

(defmethod process-message :ready [server client _message]
  ; tunnel's client is ready after connection
  ; ask him to bootstrap nREPL environment if it wasn't done already
  (let [session (get-client-session server client)]
    (send! client {:op      :bootstrap
                   :session session})))

(defmethod process-message :init-done [_server _client _message])

(defmethod process-message :error [_server _client message]
  (println "DevTools reported error" message))

(defmethod process-message :nrepl-message [server client message]
  (if-let [envelope (:envelope message)]
    (let [session (get-client-session server client)
          envelope-with-session (assoc envelope :session session)]
      (nrepl-protocols/deliver-message-to-server! (get-tunnel server) envelope-with-session))))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn on-message [server client message]
  (process-message server client message))

(defn on-incoming-client [server client]
  (println "new client connected to tunnel" client)
  (let [tunnel (get-tunnel server)
        session (nrepl-protocols/open-session tunnel)]
    (set-client-session! server client session)))

(defn on-leaving-client [server client]
  (println "client disconnected from tunnel" client)
  (let [tunnel (get-tunnel server)
        session (get-client-session server client)]
    @(nrepl-protocols/deliver-message-to-server! (get-tunnel server) {:op "eval" :session session :code ":cljs/quit"})        ; blocks until delivered
    (nrepl-protocols/close-session tunnel session)
    (remove-client-session! server session)))

(defn start! [tunnel options]
  (let [server-options (assoc options
                         :on-message on-message
                         :on-incoming-client on-incoming-client
                         :on-leaving-client on-leaving-client)
        server (server/start! server-options)]
    (let [port (-> (server/get-http-server server) meta :local-port)
          ip (:ip options)]
      (println (str "Started Dirac nREPL tunnel server on ws://" ip ":" port))
      (alter-meta! server assoc
                   :tunnel tunnel
                   :ip ip
                   :port port
                   :client-sessions {})
      server)))