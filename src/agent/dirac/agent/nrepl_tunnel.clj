(ns dirac.agent.nrepl-tunnel
  (require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
           [dirac.agent.nrepl-tunnel-server :as nrepl-tunnel-server]
           [dirac.agent.nrepl-client :as nrepl-client]))

; -- tunnel constructor -----------------------------------------------------------------------------------------------------

(defn make-tunnel []
  {:nrepl-client            (atom nil)
   :nrepl-tunnel-server     (atom nil)
   :server-messages-channel (atom nil)                                                                                        ; a channel for incoming messages from server, to be forwarded to client
   :client-messages-channel (atom nil)})                                                                                      ; a channel for incoming messages from client, to be forwared to server

(defn destroy-tunnel [tunnel]
  )

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
  @(:nrepl-client tunnel))

(defn set-nrepl-client! [tunnel client]
  (reset! (:nrepl-client tunnel) client))

; -- tunnel message channels ------------------------------------------------------------------------------------------------

(defn run-server-messages-channel-processing-loop! [tunnel]
  (println "starting server-messages-channel-processing-loop")
  (go-loop []
    (if-let [message-chan (get-server-messages-channel tunnel)]
      (if-let [message (<! message-chan)]
        (let [client (get-nrepl-client tunnel)]
          (println "sending message " message " to client " client)
          (nrepl-client/send! client message)
          (recur))
        (println "exitting server-messages-channel-processing-loop")))))

(defn run-client-messages-channel-processing-loop! [tunnel]
  (println "starting client-messages-channel-processing-loop")
  (go-loop []
    (if-let [message-chan (get-client-messages-channel tunnel)]
      (if-let [message (<! message-chan)]
        (let [server (get-nrepl-tunnel-server tunnel)]
          (println "sending message " message " to server " server)
          (nrepl-tunnel-server/send! server message)
          (recur))
        (println "exitting client-messages-channel-processing-loop")))))

; -- tunnel -----------------------------------------------------------------------------------------------------------------

(defn prepare-nrepl-client-options [base-options messages-channel]
  (assoc base-options
    :messages-channel messages-channel))

(defn prepare-nrepl-tunnel-server-options [base-options messages-channel]
  (assoc base-options
    :messages-channel messages-channel))

(defn start! [nrepl-client-options nrepl-tunnel-server-options]
  (let [tunnel (make-tunnel)
        server-messages (chan)
        client-messages (chan)]
    (set-server-messages-channel! tunnel server-messages)
    (set-client-messages-channel! tunnel client-messages)
    (run-server-messages-channel-processing-loop! tunnel)
    (run-client-messages-channel-processing-loop! tunnel)
    (let [client-options (prepare-nrepl-client-options nrepl-client-options client-messages)
          nrepl-client (nrepl-client/connect! client-options)
          server-options (prepare-nrepl-tunnel-server-options nrepl-tunnel-server-options server-messages)
          nrepl-tunnel-server (nrepl-tunnel-server/start! server-options)]
      (set-nrepl-client! tunnel nrepl-client)
      (set-nrepl-tunnel-server! tunnel nrepl-tunnel-server)
      tunnel)))