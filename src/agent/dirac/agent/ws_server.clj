; taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.agent.ws-server
  (:require [org.httpkit.server :as http])
  (:import [java.io IOException]))

; in following methods `server` is an atom holding server state
; new server instances can be created via `start!` function

; -- server state helpers ---------------------------------------------------------------------------------------------------

(defn make-server [http-server channel-promise response-handler options]
  {:http-server      http-server
   :channel-promise  channel-promise                                                                                          ; after server starts, a promise that derefs to a channel when a client connected
   :response-handler response-handler
   :options          options})

(defn get-channel-promise [server]
  (:channel-promise @server))

(defn set-channel-promise [server new-channel-promise]
  (swap! server assoc :channel-promise new-channel-promise))

(defn get-response-handler [server]
  (:response-handler @server))

(defn get-http-server [server]
  (:http-server @server))

(defn get-options [server]
  (:options @server))

(defn started? [server]
  (not (nil? (get-channel-promise server))))

(defn connected? [server]
  (realized? (get-channel-promise server)))

; -- serialization  ---------------------------------------------------------------------------------------------------------

(defn serialize-msg [msg]
  (pr-str msg))

(defn unserialize-msg [unserialized-msg]
  (read-string unserialized-msg))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn on-close [server status]
  (let [{:keys [on-close]} (get-options server)]
    (if on-close
      (on-close server status)))
  (set-channel-promise server (promise)))

(defn on-receive [server serialized-msg]
  (if-let [handler (get-response-handler server)]
    (let [msg (unserialize-msg serialized-msg)]
      (handler msg))
    (throw (IOException. "Response handler not specified!"))))

(defn send-occupied-response-and-close! [channel _server]
  (http/send! channel (serialize-msg {:op :error, :type :occupied}))                                                          ; TODO: this should be customizable
  (http/close channel))

(defn accept-client [channel server]
  ; TODO: do also some on-error handling?
  (deliver (get-channel-promise server) channel)
  (http/on-close channel (partial on-close server))
  (http/on-receive channel (partial on-receive server)))

(defn client-connection-handler
  "Handler gets called for every new client connection.
  We currently support only one client."
  [server request]
  ;(println "WEASEL-SERVER HANDLE:" request)
  (http/with-channel request channel
    (if-not (http/websocket? channel)
      {:status 200 :body "Please connect with a websocket!"}
      (if (connected? server)
        (send-occupied-response-and-close! channel server)
        (accept-client channel server)))))

; -- sending ----------------------------------------------------------------------------------------------------------------

(defn send! [server msg]
  (cond
    (not (started? server)) (throw (IOException. "WebSocket server not started!"))
    (not (connected? server)) (throw (IOException. "WebSocket channel has no client connected"))
    :else (let [serialized-msg (serialize-msg msg)
                channel (get-channel-promise server)]
            (http/send! @channel serialized-msg))))

; -- life cycle -------------------------------------------------------------------------------------------------------------

(defn start!
  "Starts a new server and returns atom holding server state.
  This server atom can be used for subsequent stop!, send! or wait-for-client calls."
  [response-handler opts]
  {:pre [(ifn? response-handler)]}
  (let [server-atom (atom nil)
        connection-handler (partial client-connection-handler server-atom)
        server (make-server (http/run-server connection-handler opts) (promise) response-handler opts)]
    (reset! server-atom server)
    server-atom))

(defn stop! [server]
  (when-let [http-server (get-http-server server)]
    (http-server)
    (reset! server nil)))

(defn wait-for-client [server]
  @(get-channel-promise server)
  nil)