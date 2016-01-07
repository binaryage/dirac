(ns dirac.agent.nrepl-tunnel
  (require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
           [dirac.agent.nrepl-protocols :refer [NREPLTunnelService]]
           [dirac.agent.nrepl-tunnel-server :as nrepl-tunnel-server]
           [dirac.agent.nrepl-client :as nrepl-client]
           [clojure.tools.nrepl :as nrepl]))

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
; Currently tunnel-server can accept only one client connection. You cannot have two or more instances of DevTools connected
; to the same tunnel. You would have to start multiple tunnels on different ports.

; -- tunnel constructor -----------------------------------------------------------------------------------------------------

(declare do-deliver-server-message!)
(declare do-deliver-client-message!)
(declare do-open-session!)
(declare do-close-session!)

(defrecord NREPLTunnel []
  NREPLTunnelService                                                                                                          ; in some cases nrepl-client and nrepl-tunnel-server need to talk to their tunnel
  (open-session [this]
    (do-open-session! this))
  (close-session [this session]
    (do-close-session! this session))
  (bootstrapped? [this]
    false)
  (deliver-message-to-server! [this message]
    (do-deliver-server-message! this message))
  (deliver-message-to-client! [this message]
    (do-deliver-client-message! this message)))

(defn make-tunnel []
  (merge (NREPLTunnel.) {:nrepl-client            (atom nil)
                         :nrepl-tunnel-server     (atom nil)
                         :server-messages-channel (atom nil)                                                                  ; a channel for incoming messages from server, to be forwarded to client
                         :client-messages-channel (atom nil)}))                                                               ; a channel for incoming messages from client, to be forwarded to server

; -- tunnel manipulation ----------------------------------------------------------------------------------------------------

(defn get-server-messages-channel [tunnel]
  @(:server-messages-channel tunnel))

(defn set-server-messages-channel! [tunnel channel]
  (reset! (:server-messages-channel tunnel) channel))

(defn get-client-messages-channel [tunnel]
  @(:client-messages-channel tunnel))

(defn set-client-messages-channel! [tunnel channel]
  (reset! (:client-messages-channel tunnel) channel))

(defn get-nrepl-tunnel-server [tunnel]
  @(:nrepl-tunnel-server tunnel))

(defn set-nrepl-tunnel-server! [tunnel server]
  (reset! (:nrepl-tunnel-server tunnel) server))

(defn get-nrepl-client [tunnel]
  {:pre  [tunnel]
   :post [%]}
  @(:nrepl-client tunnel))

(defn set-nrepl-client! [tunnel client]
  {:pre [tunnel client]}
  (reset! (:nrepl-client tunnel) client))

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

(defn do-deliver-server-message! [tunnel message]
  (let [channel (get-server-messages-channel tunnel)
        receipt (promise)]
    (put! channel [message receipt])
    receipt))

(defn do-deliver-client-message! [tunnel message]
  (let [channel (get-client-messages-channel tunnel)
        receipt (promise)]
    (put! channel [message receipt])
    receipt))

(defn do-open-session! [tunnel]
  (let [nrepl-client (get-nrepl-client tunnel)
        new-session (nrepl-client/open-session nrepl-client)]
    new-session))

(defn do-close-session! [tunnel session]
  (let [nrepl-client (get-nrepl-client tunnel)]
    (nrepl-client/close-session nrepl-client session)))

(defn run-server-messages-channel-processing-loop! [tunnel]
  ;(println "starting server-messages-channel-processing-loop")
  (go-loop []
    (let [messages-chan (get-server-messages-channel tunnel)]
      (if-let [[message receipt] (<! messages-chan)]
        (let [client (get-nrepl-client tunnel)]
          ;(println "sending message " message " to client " client)
          (deliver receipt (nrepl-client/send! client message))
          (recur))
        (println "exitting server-messages-channel-processing-loop")))))

(defn run-client-messages-channel-processing-loop! [tunnel]
  ;(println "starting client-messages-channel-processing-loop")
  (go-loop []
    (let [messages-chan (get-client-messages-channel tunnel)]
      (if-let [[message receipt] (<! messages-chan)]
        (let [server (get-nrepl-tunnel-server tunnel)]
          ;(println "sending message " message " to server " server)
          (deliver receipt (nrepl-tunnel-server/dispatch-message! server message))
          (recur))
        (println "exitting client-messages-channel-processing-loop")))))

; -- tunnel -----------------------------------------------------------------------------------------------------------------

(defn start! [nrepl-client-options nrepl-tunnel-server-options]
  (let [tunnel (make-tunnel)
        server-messages (chan)
        client-messages (chan)]
    (set-server-messages-channel! tunnel server-messages)
    (set-client-messages-channel! tunnel client-messages)
    (run-server-messages-channel-processing-loop! tunnel)
    (run-client-messages-channel-processing-loop! tunnel)
    (let [nrepl-client (nrepl-client/connect! tunnel nrepl-client-options)
          nrepl-tunnel-server (nrepl-tunnel-server/start! tunnel nrepl-tunnel-server-options)]
      (set-nrepl-client! tunnel nrepl-client)
      (set-nrepl-tunnel-server! tunnel nrepl-tunnel-server)
      tunnel)))

(defn url-for [ip port]
  (str "ws://" ip ":" port))

(defn request-weasel-connection [tunnel session ip port]
  (let [server (get-nrepl-tunnel-server tunnel)
        message {:op         :connect-weasel
                 :server-url (url-for ip port)}
        client (nrepl-tunnel-server/get-client-for-session server session)]
    (nrepl-tunnel-server/send! client message)))