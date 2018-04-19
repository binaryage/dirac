(ns dirac.test-lib.mock-weasel-client
  (:require [clojure.core.async :refer [<! <!! >!! alts!! chan close! go go-loop put! timeout]]
            [clojure.tools.logging :as log]
            [http.async.client :as http]))

(defrecord MockWeaselClient [id client ws channel]
  Object
  (toString [this]
    (str "[MockWeaselClient#" (:id this) "]")))

(def last-id (volatile! 0))

(defn next-id! []
  (vswap! last-id inc))

(defn make-client! [client ws channel]
  (let [client (MockWeaselClient. (next-id!) client ws channel)]
    (log/trace "Made" (str client))
    client))

; -- access -----------------------------------------------------------------------------------------------------------------

(defn get-ws [client]
  (:ws client))

(defn get-channel [client]
  (:channel client))

; -- channel operations -----------------------------------------------------------------------------------------------------

(defn channel-put! [client-promise value]
  (future
    (let [client @client-promise]
      (log/debug (str client) "weasel event > " value)
      (put! (get-channel client) value))))

; -- serialization ----------------------------------------------------------------------------------------------------------

(defn serialize-message [msg]
  (pr-str msg))

(defn unserialize-msg [serialized-msg]
  (read-string serialized-msg))

; -- handlers ---------------------------------------------------------------------------------------------------------------

(defn on-event [client-promise & args]
  (channel-put! client-promise (vec args)))

(defn on-message [client-promise _ws serialized-msg]
  (let [msg (unserialize-msg serialized-msg)]
    (channel-put! client-promise [:msg msg])))

; -- api --------------------------------------------------------------------------------------------------------------------

(defn create! [url]
  {:pre (string? url)}
  (let [http-client (http/create-client)
        client-promise (promise)
        channel (chan)
        ws (http/websocket http-client
                           url
                           :open (partial on-event client-promise :open)
                           :close (partial on-event client-promise :close)
                           :error (partial on-event client-promise :error)
                           :text (partial on-message client-promise))
        client (make-client! http-client ws channel)]
    (deliver client-promise client)
    client))

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

(defn destroy! [_client])
