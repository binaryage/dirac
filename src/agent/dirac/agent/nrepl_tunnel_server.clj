(ns dirac.agent.nrepl-tunnel-server
  (:require [dirac.agent.ws-server :as server]
            [dirac.agent.nrepl-state :refer [client->server-chan server->client-chan]]
            [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]))

(def default-opts {:ip   "127.0.0.1"
                   :port 9001})

(def client-response (atom nil))                                                                                              ; stores a promise fulfilled by a client's eval response

(def tunnel-server (atom nil))

; -- message sending --------------------------------------------------------------------------------------------------------\

(defn send! [msg]
  (if-let [server @tunnel-server]
    (server/send! server msg)
    (println "no server?")))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message (fn [_ msg] (:op msg)))

(defmethod process-message :result [_ message]
  (let [result (:value message)]
    (when-not (nil? @client-response)
      (deliver @client-response result))))

(defmethod process-message :ready [_ _])

(defmethod process-message :error [_ message]
  (println "DevTools reported error" message))

(defmethod process-message :nrepl-message [_ message]
  (if-let [envelope (:envelope message)]
    (put! client->server-chan envelope)))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn response-handler [server-atom data]
  (process-message @server-atom data))

(defn start! [options]
  (let [server-options (select-keys options [:ip :port])
        server (server/start! (partial response-handler tunnel-server) server-options)
        {:keys [ip]} options]
    (reset! tunnel-server server)
    (let [port (-> (server/get-http-server server) meta :local-port)]
      (println (str "<< started Dirac nREPL tunnel server on ws://" ip ":" port " >>")))
    (flush)
    (server/wait-for-client server)
    (println "a client connected to nREPL tunnel")))

(defn run-message-loop! []
  (go-loop []
    (if-let [msg (<! server->client-chan)]
      (do
        (println "sending message to client" msg)
        (send! msg)
        (recur))
      (println "exitting nrepl-client message loop"))))