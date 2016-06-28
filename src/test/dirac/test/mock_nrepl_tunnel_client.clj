(ns dirac.test.mock-nrepl-tunnel-client
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [http.async.client :as http]
            [clojure.tools.logging :as log]))

(defrecord MockNREPLTunnelClient [id client ws channel]
  Object
  (toString [this]
    (str "[MockNREPLTunnelClient#" (:id this) "]")))

(def last-id (volatile! 0))

(defn next-id! []
  (vswap! last-id inc))

(defn make-client! [client ws channel]
  (let [client (MockNREPLTunnelClient. (next-id!) client ws channel)]
    (log/trace "Made" (str client))
    client))

; -- access -----------------------------------------------------------------------------------------------------------------

(defn get-ws [client]
  (:ws client))

(defn get-channel [client]
  (:channel client))

; -- serialization ----------------------------------------------------------------------------------------------------------

(defn serialize-message [msg]
  (pr-str msg))

(defn unserialize-msg [serialized-msg]
  (read-string serialized-msg))

; -- handlers ---------------------------------------------------------------------------------------------------------------

(defn on-event [channel & args]
  (let [info (vec args)]
    (log/debug "got event" info)
    (put! channel info)))

(defn on-message [channel _ws serialized-msg]
  (let [msg (unserialize-msg serialized-msg)
        info [:msg msg]]
    (log/debug "received msg" info)
    (put! channel info)))

; -- api --------------------------------------------------------------------------------------------------------------------

(defn create! [url]
  (let [client (http/create-client)
        channel (chan)
        ws (http/websocket client
                           url
                           :open (partial on-event channel :open)
                           :close (partial on-event channel :close)
                           :error (partial on-event channel :error)
                           :text (partial on-message channel))]
    (make-client! client ws channel)))

(def last-msg-id (volatile! 0))

(defn next-msg-id! []
  (vswap! last-msg-id inc))

(defn massage-message! [msg]
  (assoc msg
    :id (next-msg-id!)))

(defn send! [client msg]
  (let [serialized-msg (serialize-message (massage-message! msg))]
    (log/debug "sending text:" serialized-msg)
    (http/send (get-ws client) :text serialized-msg)))
