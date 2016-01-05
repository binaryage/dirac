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

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [server msg]
  {:pre [server]}
  (server/send! server msg))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message (fn [_server msg] (:op msg)))

(defmethod process-message :default [_server message]
  (println "Received unrecognized message from tunnel client" message))

(defmethod process-message :ready [server _message]
  (let [tunnel (get-tunnel server)]
    ; tunnel's client is ready after connection
    ; ask him to bootstrap nREPL environment if it wasn't done already
    (if-not (nrepl-protocols/bootstrapped? tunnel)
      (send! server {:op :bootstrap}))))

(defmethod process-message :init-done [_server _message])

(defmethod process-message :error [_server message]
  (println "DevTools reported error" message))

(defmethod process-message :nrepl-message [server message]
  (if-let [envelope (:envelope message)]
    (nrepl-protocols/deliver-server-message! (get-tunnel server) envelope)))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn response-handler [server-atom data]
  (let [server @server-atom]
    (assert server "Server atom must be set before handling responses")
    (process-message server data)))

(defn start! [tunnel options]
  (let [server-atom (atom nil)
        server (server/start! (partial response-handler server-atom) options)]
    (alter-meta! server assoc :tunnel tunnel)
    (reset! server-atom server)
    (let [port (-> (server/get-http-server server) meta :local-port)
          ip (:ip options)]
      (println (str "started Dirac nREPL tunnel server on ws://" ip ":" port)))
    server))