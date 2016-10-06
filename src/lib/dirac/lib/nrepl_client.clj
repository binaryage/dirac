(ns dirac.lib.nrepl-client
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.nrepl :as nrepl]
            [clojure.tools.nrepl.transport :as nrepl.transport]
            [clojure.tools.logging :as log]
            [dirac.lib.nrepl-protocols :as nrepl-protocols]
            [dirac.lib.utils :as utils]
            [dirac.lib.bencode-hell :as bencode-hell])
  (:use [clojure.tools.nrepl.misc :only (uuid)])
  (:import (java.net SocketException)))

; this is a thin wrapper of clojure.tools.nrepl/client which cooperates with parent nREPL tunnel

; note: here is a subtle naming clash, we call our namespace 'nrepl-client' to produce nrepl-client instances via connect!
; but underlying nREPL client created via clojure.tools.nrepl/client can be also called nrepl-client
; so we decided to call underlying client "raw-nrepl-client" instead

; -- NREPLClient constructor ------------------------------------------------------------------------------------------------

(defrecord NREPLClient [id options connection raw-nrepl-client response-poller response-table]
  Object
  (toString [this]
    (let [tunnel (:tunnel (meta this))]
      (str "[NREPLClient#" (:id this) " of " (str tunnel) "]"))))

(def last-id (volatile! 0))

(defn next-id! []
  (vswap! last-id inc))

(defn make-client [tunnel options connection raw-nrepl-client response-poller response-table]
  (let [client (NREPLClient. (next-id!) options connection raw-nrepl-client response-poller response-table)
        client (vary-meta client assoc :tunnel tunnel)]
    (log/trace "Made" (str client))
    client))

; -- NREPLClient getters/setters --------------------------------------------------------------------------------------------

(defn get-tunnel [client]
  {:pre [(instance? NREPLClient client)]}
  (:tunnel (meta client)))

(defn get-connenction [client]
  {:pre [(instance? NREPLClient client)]}
  (:connection client))

(defn get-response-poller [client]
  {:pre [(instance? NREPLClient client)]}
  (:response-poller client))

(defn get-raw-nrepl-client [client]
  {:pre [(instance? NREPLClient client)]}
  (:raw-nrepl-client client))

(defn get-options [client]
  {:pre [(instance? NREPLClient client)]}
  (:options client))

(defn get-response-table [client]
  {:pre [(instance? NREPLClient client)]}
  (:response-table client))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn connected? [client]
  {:pre [(instance? NREPLClient client)]}
  (not (nil? (get-raw-nrepl-client client))))

(defn get-connection-url [options]
  (let [{:keys [host port]} options]
    (utils/get-nrepl-server-url host port)))

(defn get-server-connection-url [client]
  (get-connection-url (get-options client)))

(defn get-client-info [client]
  {:pre [(instance? NREPLClient client)]}
  (if (connected? client)
    (let [url (get-server-connection-url client)]
      (str "Connected to nREPL server at " url "."))
    (str "Not connected to nREPL server.")))

(defn connect-with-options [options]
  (nrepl/url-connect (get-connection-url options)))

; -- sending ----------------------------------------------------------------------------------------------------------------

(defn send! [client message]
  (let [dirty-message (bencode-hell/encode-poo message)
        raw-nrepl-client (get-raw-nrepl-client client)
        response-table (get-response-table client)
        channel (chan)
        msg-id (or (:id dirty-message) (uuid))
        msg (assoc dirty-message :id msg-id)]
    (swap! response-table assoc msg-id channel)
    (nrepl/message raw-nrepl-client msg)
    channel))

; -- session management -----------------------------------------------------------------------------------------------------

(defn open-session [client]
  {:pre [(instance? NREPLClient client)]}
  (log/trace (str client) "open session")
  (send! client {:op "clone"}))

(defn close-session [client session]
  {:pre [(instance? NREPLClient client)]}
  (log/trace (str client) "close session #" (utils/sid session))
  (send! client {:op "close" :session session}))

; -- polling for responses --------------------------------------------------------------------------------------------------

(defn read-next-response [connection]
  (try
    (nrepl.transport/recv connection)
    (catch SocketException _
      ::socket-closed)
    (catch InterruptedException _
      ::interrupted)
    (catch Throwable e
      (vary-meta '(::error) assoc :exception e))))                                                                            ; keywords cannot carry metadata

(defn submit-response-to-table! [response response-table]
  (if-let [id (:id response)]
    (if-let [channel (get @response-table id)]
      (do
        (put! channel response)
        (when (:status response)
          (close! channel)
          (swap! response-table dissoc id)))
      (log/trace "no channel" id "in" @response-table "?"))
    (log/trace "no message id?" response)))

(defn poll-for-responses [tunnel connection response-table _options]
  (loop []
    (let [response (read-next-response connection)]
      (log/trace (str tunnel) "got response" response)
      (case response
        ::interrupted (log/debug (str tunnel) "Leaving poll-for-responses loop - interrupted")
        ::socket-closed (log/debug (str tunnel) "Leaving poll-for-responses loop - connection closed")
        '(::error) (log/error (str tunnel) "Leaving poll-for-responses loop - error:\n" (:exception (meta response)))
        (let [clean-response (bencode-hell/decode-poo response)]
          (submit-response-to-table! clean-response response-table)
          (nrepl-protocols/deliver-message-to-client! tunnel clean-response)
          (recur))))))

(defn wait-for-response-poller-shutdown [client timeout]
  (let [response-poller (get-response-poller client)]
    (when (= (deref response-poller timeout ::timeout) ::timeout)
      (log/error (str client) "The response-poller didn't shut down gracefully => forcibly cancelling")
      (future-cancel response-poller))))

(defn spawn-response-poller! [tunnel connection response-table options]
  (future (poll-for-responses tunnel connection response-table options)))

; -- life cycle -------------------------------------------------------------------------------------------------------------

(defn create! [tunnel options]
  (let [connection (connect-with-options options)
        raw-nrepl-client (nrepl/client connection Long/MAX_VALUE)                                                             ; TODO: response timeout should be configurable
        response-table (atom {})
        response-poller (spawn-response-poller! tunnel connection response-table options)
        client (make-client tunnel options connection raw-nrepl-client response-poller response-table)]
    (log/debug "Created" (str client))
    client))

(defn destroy! [client & opts]
  (let [{:keys [timeout] :or {timeout 1000}} opts
        connection (get-connenction client)]
    (log/trace "Destroying" (str client))
    (.close connection)                                                                                                       ; poll-for-responses should gracefully leave its loop
    (wait-for-response-poller-shutdown client timeout)
    (log/debug "Destroyed" (str client))))
