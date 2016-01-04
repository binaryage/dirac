(ns dirac.agent.nrepl-tunnel-server
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [dirac.agent.ws-server :as server]))

(def default-opts {:ip   "127.0.0.1"
                   :port 9001})

; -- message sending --------------------------------------------------------------------------------------------------------\

(defn send! [server msg]
  {:pre [server]}
  (server/send! server msg))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message (fn [_server msg] (:op msg)))

(defmethod process-message :default [_server message]
  (println "Received unrecognized message from tunnel client" message))

(defmethod process-message :ready [server _message]
  ; tunnel-client is ready, send him init message to init repl env
  (send! server {:op :init}))

(defmethod process-message :init-done [_server _message])

(defmethod process-message :error [_server message]
  (println "DevTools reported error" message))

(defmethod process-message :nrepl-message [server message]
  (let [{:keys [messages-channel]} (server/get-options server)]
    (assert messages-channel)
    (if-let [envelope (:envelope message)]
      (put! messages-channel envelope))))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn response-handler [server-atom data]
  (let [server @server-atom]
    (assert server "Server atom must be set before handling responses")
    (process-message server data)))

(defn sanitize-server-options [options]
  (assert (:messages-channel options) "options must specify message channel")
  options)

(defn start! [options]
  (let [server-options (sanitize-server-options options)
        server-atom (atom nil)
        server (server/start! (partial response-handler server-atom) server-options)]
    (reset! server-atom server)
    (let [port (-> (server/get-http-server server) meta :local-port)
          ip (:ip options)]
      (println (str "started Dirac nREPL tunnel server on ws://" ip ":" port)))
    server))