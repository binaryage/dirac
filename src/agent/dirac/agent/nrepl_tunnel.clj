(ns dirac.agent.nrepl-tunnel
  (require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
           [clojure.tools.logging :as log]
           [dirac.agent.nrepl-protocols :refer [NREPLTunnelService]]
           [dirac.agent.nrepl-tunnel-server :as nrepl-tunnel-server]
           [dirac.agent.nrepl-client :as nrepl-client]
           [dirac.agent.utils :as utils]))

; Unfortunately, we cannot easily implement full-blown nREPL client in Dirac DevTools.
; First, we don't have real sockets API, we can use only websockets from javascript.
; Second, we don't have libraries like bencode or clojure.tools.nrepl on javascript side.
; To implement full nREPL client, we would have to re-implement them from scratch.
;
; Instead we decided to run nREPL client in Clojure on server-side and open a rather dumb websocket tunnel
; to expose nREPL functionality to Dirac DevTools.
;
; The tunnel maintains two things:
; 1) nrepl-client (an active client nREPL connection implemented using clojure.tools.nrepl)
; 2) nrepl-tunnel-server (a websocket connection to Dirac DevTools for tunneling messages between nREPL and Dirac REPL)
;
; High level mental model:
; [ nREPL server]  <-s->  [============ our tunnel ==================]  <-ws->  [ Dirac DevTools REPL ]
;
; Implementation details:
;        ?         <-s->  [ nREPL client ] <-> [ nREPL tunnel server ]  <-ws->  [ nREPL tunnel client ]
;
; <-s->  is a socket connection
; <->    is a direct in-process connection (we use core.async channels there)
; <-ws-> is a websocket connection
;
; Tunnel implementation should be robust, client-side (Dirac) endpoint can connect and go-away at any point (browser refresh).
; nREPL client session should persist between reconnections.
;
; TODO: document multiple clients
; Currently tunnel-server can accept only one client connection. You cannot have two or more instances of DevTools connected
; to the same tunnel. You would have to start multiple tunnels on different ports.

; -- tunnel constructor -----------------------------------------------------------------------------------------------------

(declare deliver-server-message!)
(declare deliver-client-message!)
(declare open-session!)
(declare close-session!)

(defrecord NREPLTunnel [id options nrepl-client nrepl-tunnel-server server-messages-channel client-messages-channel]
  NREPLTunnelService                                                                                                          ; in some cases nrepl-client and nrepl-tunnel-server need to talk to their tunnel
  (open-session [this]
    (open-session! this))
  (close-session [this session]
    (close-session! this session))
  (deliver-message-to-server! [this message]
    (deliver-server-message! this message))
  (deliver-message-to-client! [this message]
    (deliver-client-message! this message))

  Object
  (toString [this]
    (str "NREPLTunnel#" (:id this))))

(def last-id (volatile! 0))

(defn next-id! []
  (vswap! last-id inc))

(defn make-tunnel! [options]
  (let [tunnel (NREPLTunnel. (next-id!) options (atom nil) (atom nil) (atom nil) (atom nil))]
    (log/trace "made" (str tunnel))
    tunnel))

; -- tunnel access ----------------------------------------------------------------------------------------------------------

(defn get-server-messages-channel [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  @(:server-messages-channel tunnel))

(defn set-server-messages-channel! [tunnel channel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (reset! (:server-messages-channel tunnel) channel))

(defn get-client-messages-channel [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  @(:client-messages-channel tunnel))

(defn set-client-messages-channel! [tunnel channel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (reset! (:client-messages-channel tunnel) channel))

(defn get-nrepl-tunnel-server [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  @(:nrepl-tunnel-server tunnel))

(defn set-nrepl-tunnel-server! [tunnel server]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (reset! (:nrepl-tunnel-server tunnel) server))

(defn get-nrepl-client [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  @(:nrepl-client tunnel))

(defn set-nrepl-client! [tunnel client]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (reset! (:nrepl-client tunnel) client))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-tunnel-info [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (let [tunnel-server (get-nrepl-tunnel-server tunnel)
        tunnel-url (nrepl-tunnel-server/get-server-url tunnel-server)
        nrepl-client (get-nrepl-client tunnel)
        client-info (nrepl-client/get-client-info nrepl-client)]
    (str client-info " Tunnel is accepting connections on " tunnel-url ".")))

; -- tunnel message channels ------------------------------------------------------------------------------------------------
;
; When nREPL client receives a message fron nREPL server, we don't send the message immediatelly through the tunnel.
; Instead we put! it into server-messages-channel and run independent processing loop to consume this channel
; and feed the tunnel sequentially.
;
; It works similar way in the other direction. When tunnel client sends a message and we receive it in our tunnel server,
; we don't immediatelly call nrepl-client/send!, instead we put! the message onto client-messages-channel and
; let client-messages processing loop consume it and send it to nREPL client.
;
; Using channels has two main advantages:
; 1) if needed, we could transparently inject any message transformation into channels (a channel transducer)
; 2) channels have buffering controls
;

(defn deliver-server-message! [tunnel message]
  (let [channel (get-server-messages-channel tunnel)
        receipt (promise)]
    (log/trace (str "enqueue message " (utils/sid message) " to be sent to nREPL server:\n")
               (utils/pp message))
    (put! channel [message receipt])
    receipt))

(defn deliver-client-message! [tunnel message]
  (let [channel (get-client-messages-channel tunnel)
        receipt (promise)]
    (log/trace (str "enqueue message " (utils/sid message) " to be sent to a DevTools client via tunnel:\n")
               (utils/pp message))
    (put! channel [message receipt])
    receipt))

(defn open-session! [tunnel]
  (let [nrepl-client (get-nrepl-client tunnel)
        new-session (nrepl-client/open-session nrepl-client)]
    new-session))

(defn close-session! [tunnel session]
  (let [nrepl-client (get-nrepl-client tunnel)]
    (nrepl-client/close-session nrepl-client session)))

(defn run-server-messages-channel-processing-loop! [tunnel]
  (log/debug "starting server-messages-channel-processing-loop")
  (go-loop []
    (let [messages-chan (get-server-messages-channel tunnel)]
      (if-let [[message receipt] (<! messages-chan)]
        (let [client (get-nrepl-client tunnel)]
          (deliver receipt (nrepl-client/send! client message))
          (log/trace (str "sent message " (utils/sid message) " to nREPL server of " (str tunnel)))
          (recur))
        (log/debug "exitting server-messages-channel-processing-loop")))))

(defn run-client-messages-channel-processing-loop! [tunnel]
  (log/debug "starting client-messages-channel-processing-loop")
  (go-loop []
    (let [messages-chan (get-client-messages-channel tunnel)]
      (if-let [[message receipt] (<! messages-chan)]
        (let [server (get-nrepl-tunnel-server tunnel)]
          (deliver receipt (nrepl-tunnel-server/dispatch-message! server message))
          (log/trace (str "sent message " (utils/sid message) " to tunnel of " (str tunnel)))
          (recur))
        (log/debug "exitting client-messages-channel-processing-loop")))))

; -- tunnel -----------------------------------------------------------------------------------------------------------------

(defn create! [options]
  (let [tunnel (make-tunnel! options)
        server-messages (chan)
        client-messages (chan)]
    (set-server-messages-channel! tunnel server-messages)
    (set-client-messages-channel! tunnel client-messages)
    (let [nrepl-client (nrepl-client/create! tunnel (:nrepl-server options))
          nrepl-tunnel-server (nrepl-tunnel-server/create! tunnel (:nrepl-tunnel options))]
      (set-nrepl-client! tunnel nrepl-client)
      (set-nrepl-tunnel-server! tunnel nrepl-tunnel-server)
      (run-server-messages-channel-processing-loop! tunnel)
      (run-client-messages-channel-processing-loop! tunnel)
      (log/debug "created" (str tunnel))
      tunnel)))

(defn destroy! [tunnel]
  (log/trace "destroying" (str tunnel))
  (close! (get-client-messages-channel tunnel))
  (when-let [nrepl-tunnel-server (get-nrepl-tunnel-server tunnel)]
    (nrepl-tunnel-server/destroy! nrepl-tunnel-server)
    (set-nrepl-tunnel-server! tunnel nil))
  (close! (get-server-messages-channel tunnel))
  (when-let [nrepl-client (get-nrepl-client tunnel)]
    (nrepl-client/destroy! nrepl-client)
    (set-nrepl-client! tunnel nil))
  (set-client-messages-channel! tunnel nil)
  (set-server-messages-channel! tunnel nil)
  (log/debug "destroyed" (str tunnel))
  true)

(defn request-weasel-connection [tunnel session ip port]
  (log/debug "request-weasel-connection for" (str tunnel) " client" session)
  (let [server (get-nrepl-tunnel-server tunnel)
        message {:op         :connect-weasel
                 :server-url (utils/get-ws-url ip port)}
        client (nrepl-tunnel-server/get-client-for-session server session)]
    (nrepl-tunnel-server/send! client message)))