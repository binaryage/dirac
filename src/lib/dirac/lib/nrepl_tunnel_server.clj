(ns dirac.lib.nrepl-tunnel-server
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.logging :as log]
            [version-clj.core :refer [version-compare]]
            [dirac.lib.nrepl-protocols :refer :all]
            [dirac.lib.ws-server :as ws-server]
            [dirac.lib.version :as lib-version]
            [dirac.lib.utils :as utils]
            [dirac.logging :as logging]))

(def upgrading-doc-url "https://github.com/binaryage/dirac/blob/master/docs/upgrading.md")

(defn ^:dynamic old-devtools-client-msg [expected-version reported-version]
  (str "WARNING: The version of connected DevTools is old. "
       "Expected '" expected-version "', got '" reported-version "'.\n"
       "You should update your Dirac Chrome Extension to version '" expected-version "' (to match your Dirac Agent).\n"
       "Please follow Dirac upgrading instructions: " upgrading-doc-url "."))

(defn ^:dynamic future-devtools-client-msg [expected-version reported-version]
  (str "WARNING: The version of connected DevTools is unexpectedly recent. "
       "Expected '" expected-version "', got '" reported-version "'.\n"
       "You should update your Dirac Agent to version '" reported-version "' (to match your Dirac Chrome Extension).\n"
       "Please follow Dirac upgrading instructions: " upgrading-doc-url "."))

(defn version-check! [version]
  (case (version-compare lib-version/version (or version ""))
    -1 (log/warn (future-devtools-client-msg lib-version/version version))
    1 (log/warn (old-devtools-client-msg lib-version/version version))
    0 true))

; -- NREPLTunnelServer constructor ------------------------------------------------------------------------------------------

(defrecord NREPLTunnelServer [id ws-server client->session-promise]
  Object
  (toString [this]
    (let [tunnel (:tunnel (meta this))]
      (str "[NREPLTunnelServer#" (:id this) " of " (str tunnel) "]"))))

(def last-id (volatile! 0))

(defn next-id! []
  (vswap! last-id inc))

(defn make-server [tunnel]
  (let [server (NREPLTunnelServer. (next-id!) (atom nil) (atom {}))
        server (vary-meta server assoc :tunnel tunnel)]
    (log/trace "Made" (str server))
    server))

; -- NREPLTunnelServer getters/setters --------------------------------------------------------------------------------------

(defn get-ws-server [server]
  {:pre  [(instance? NREPLTunnelServer server)]
   :post [%]}
  @(:ws-server server))

(defn set-ws-server! [server ws-server]
  {:pre [(instance? NREPLTunnelServer server)]}
  (reset! (:ws-server server) ws-server))

(defn get-tunnel [server]
  {:pre [(instance? NREPLTunnelServer server)]}
  (let [tunnel (:tunnel (meta server))]
    (assert tunnel "Tunnel not specified!")
    (assert (satisfies? NREPLTunnelService tunnel) "Tunnel must satisfy NREPLTunnelService protocol")
    tunnel))

(defn get-client-for-session [server session]
  {:pre [(instance? NREPLTunnelServer server)
         (string? session)]}
  (first (first (filter #(= session @(second %)) @(:client->session-promise server)))))                                       ; this may block until session promise gets delivered

(defn get-client-session [server client]
  {:post [(string? %)]}
  (let [session-promise-table @(:client->session-promise server)
        client-session-promise (get session-promise-table client)]
    (assert client-session-promise "client already removed?")
    @client-session-promise))

(defn set-client-session-promise! [server client session-promise]
  {:pre [(instance? NREPLTunnelServer server)
         client
         (not (get @(:client->session-promise server) client))]}
  (swap! (:client->session-promise server) assoc client session-promise))

(defn remove-client! [server client]
  {:pre [(instance? NREPLTunnelServer server)
         client
         (get @(:client->session-promise server) client)]}
  (swap! (:client->session-promise server) dissoc client))

(defn get-clients [server]
  {:pre [(instance? NREPLTunnelServer server)]}
  (keys @(:client->session-promise server)))

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [client message]
  {:pre [client]}
  (let [message (update message :id #(or % (name (:op message))))]
    (log/trace (str "Sending message " (utils/sid message) " to client " (str client)))
    (ws-server/send! client message)))

(defn dispatch-message! [server message]
  {:pre [(instance? NREPLTunnelServer server)]}
  (if-let [session (:session message)]                                                                                        ; ignore messages without session
    (if-let [client (get-client-for-session server session)]                                                                  ; client may be already disconnected
      (send! client message))
    (log/trace (str server) (str "Message " (utils/sid message) " cannot be dispatched because it does not have a session"))))

(defn send-message-to-server! [server client message]
  (let [tunnel (get-tunnel server)
        session (get-client-session server client)]
    (deliver-message-to-server! tunnel (assoc message :session session))))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message (fn [_server _client msg] (:op msg)))

(defmethod process-message :default [server client message]
  (log/debug (str server) "Received unrecognized message from client" (str client) ":\n" (utils/pp message)))

(defmethod process-message :ready [server client message]
  (version-check! (:version message))
  ; a new client is ready after connection
  ; ask him to bootstrap nREPL environment
  (let [session (get-client-session server client)]
    (send! client {:op      :bootstrap
                   :version lib-version/version
                   :session session})))

(defn finish-dirac-job-reply [source-message status]
  (let [{:keys [id err out]} source-message]
    (into {:op     "finish-dirac-job"
           :status status}
          [(if id [:id id])
           (if err [:err err])
           (if out [:err out])])))

(defmethod process-message :error [server client message]
  (log/error (str server) "Received an error from client" (str client) ":\n" (utils/pp message))
  (send-message-to-server! server client (finish-dirac-job-reply message #{:error :done})))

(defmethod process-message :bootstrap-error [server client message]
  (log/error (str server) "Received a bootstrap error from client" (str client) ":\n" (utils/pp message)))

(defmethod process-message :bootstrap-timeout [server client message]
  (log/error (str server) "Received a bootstrap timeout from client" (str client) ":\n" (utils/pp message)))

(defmethod process-message :bootstrap-done [server client _message]
  (log/debug (str server) "Received a bootstrap done from client" (str client)))

(defmethod process-message :nrepl-message [server client message]
  (log/debug (str server) "process :nrepl-message from" (str client) (utils/pp message))
  (if-let [envelope (:envelope message)]
    (send-message-to-server! server client envelope)))

; -- utilities --------------------------------------------------------------------------------------------------------------

(defn cljs-quit-message []
  {:op   "eval"
   :code ":cljs/quit"})

(defn quit-client! [server client]
  (let [responses-channel @(send-message-to-server! server client (cljs-quit-message))]
    (utils/wait-for-all-responses! responses-channel)))

(defn teardown-client! [server client]
  (let [tunnel (get-tunnel server)
        session (get-client-session server client)]
    (log/trace (str client) (str "Teardown session " (utils/sid session) " from " (str server)))
    (quit-client! server client)
    (utils/wait-for-all-responses! (close-session tunnel session))))

(defn open-client-session [server client]
  (let [session-promise (promise)]
    (set-client-session-promise! server client session-promise)
    (let [tunnel (get-tunnel server)
          responses-channel (open-session tunnel)
          session-message (<!! responses-channel)
          session (:new-session session-message)]
      (assert session (str "expected session id in " session-message))
      (log/debug (str server) (str "New client initialized " (utils/sid session)))
      (deliver session-promise session))))

(defn get-server-url [server]
  (let [ws-server (get-ws-server server)
        host (ws-server/get-host ws-server)
        port (ws-server/get-local-port ws-server)
        url (utils/get-ws-url host port)]
    url))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn on-message [server _ws-server client message]
  (log/trace (str server) "received a message from" (str client) ": " message)
  (process-message server client message))

(defn on-incoming-client [server _ws-server client]
  (log/info (str server) "A new client" (str client) "connected")
  (open-client-session server client))

(defn on-leaving-client [server _ws-server client]
  (log/info (str server) "Client" (str client) "disconnected")
  (teardown-client! server client)
  (remove-client! server client)
  (log/debug (str client) (str "Removed client from " (str server))))

(defn create! [tunnel options]
  (let [server (make-server tunnel)
        server-options (merge options {:name               "nREPL Tunnel Server"
                                       :ip                 (get options :host "localhost")
                                       :port               (get options :port 8231)
                                       :on-message         (partial on-message server)
                                       :on-incoming-client (partial on-incoming-client server)
                                       :on-leaving-client  (partial on-leaving-client server)})]
    (set-ws-server! server (ws-server/create! server-options))
    (log/info (str server) (str "Started Dirac nREPL tunnel server at " (get-server-url server)))
    (log/debug "Created" (str server) (logging/pprint options))
    server))

(defn disconnect-all-clients! [server]
  (let [clients (get-clients server)]
    (doseq [client clients]
      (ws-server/close! client))))                                                                                            ; will trigger on-leaving-client call

(defn destroy! [server]
  (log/trace "Destroying" (str server))
  (ws-server/destroy! (get-ws-server server))
  (log/debug "Destroyed" (str server)))