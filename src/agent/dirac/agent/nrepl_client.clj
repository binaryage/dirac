(ns dirac.agent.nrepl-client
  (require [clojure.tools.nrepl :as nrepl]
           [clojure.tools.nrepl.transport :as nrepl.transport]
           [dirac.agent.nrepl-protocols :as nrepl-protocols])
  (:import (java.net SocketException)))

; this is a thin wrapper of clojure.tools.nrepl/client
; our client wraps clojure.tools.nrepl/client and cooperates with parent nREPL tunnel

; note: here is a subtle naming clash, we call our namespace 'nrepl-client' to produce nrepl-client instances via connect!
; but underlying nREPL client created via clojure.tools.nrepl/client can be also called nrepl-client
; so we decided to call it "raw-nrepl-client" instead

; -- constructor ------------------------------------------------------------------------------------------------------------

(defn make-client [tunnel connection raw-nrepl-client]
  {:tunnel                       tunnel
   :connection                   connection
   :raw-nrepl-client             raw-nrepl-client
   :response-poller              (atom nil)
   :response-poller-exit-promise (promise)})

; -- access -----------------------------------------------------------------------------------------------------------------

(defn get-tunnel [client]
  (:tunnel client))

(defn get-connenction [client]
  (:connection client))

(defn get-response-poller [client]
  @(:response-poller client))

(defn set-response-poller! [client poller]
  (reset! (:response-poller client) poller))

(defn get-raw-nrepl-client [client]
  (:raw-nrepl-client client))

(defn get-response-poller-exit-promise [client]
  (:response-poller-exit-promise client))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn- url-for [host port]
  (format "nrepl://%s:%s" (or host "localhost") port))

(defn connect-with-options [{:keys [host port]}]
  (let [url (url-for host port)]
    (nrepl/url-connect url)))

; -- sending ----------------------------------------------------------------------------------------------------------------

(defn send! [client message]
  (let [raw-nrepl-client (get-raw-nrepl-client client)]
    (nrepl/message raw-nrepl-client message)))

; -- session management -----------------------------------------------------------------------------------------------------

(defn open-session [client]
  (let [raw-nrepl-client (get-raw-nrepl-client client)]
    (nrepl/new-session raw-nrepl-client)))

(defn close-session [client session]
  (let [raw-nrepl-client (get-raw-nrepl-client client)]
    (nrepl/message raw-nrepl-client {:op "close" :session session})))

; -- polling for responses --------------------------------------------------------------------------------------------------

(defn read-next-response [connection]
  (try
    (nrepl.transport/recv connection)
    (catch SocketException _
      ::socket-closed)
    (catch Throwable _
      ::error)))

(defn poll-for-responses [client connection _options]
  (let [tunnel (get-tunnel client)]
    (loop []
      (let [response (read-next-response connection)]
        (case response
          ::error (println "leaving poll-for-responses loop due to an error")
          ::socket-closed (println "leaving poll-for-responses loop - connection closed")
          (do
            (nrepl-protocols/deliver-message-to-client! tunnel response)
            (recur)))))
    (deliver (get-response-poller-exit-promise client) true)))

(defn wait-for-response-poller-shutdown [client timeout timeout-val]
  (deref (get-response-poller-exit-promise client) timeout timeout-val))

(defn spawn-response-poller! [client options connection]
  (let [^Runnable operation (bound-fn []
                              (poll-for-responses client options connection))
        response-poller (Thread. operation)]
    (doto ^Thread response-poller
      (.setName "nREPL client - response poller")
      (.setDaemon true)
      (.start))
    response-poller))

; -- life cycle -------------------------------------------------------------------------------------------------------------

(defn connect! [tunnel options]
  (let [connection (connect-with-options options)
        raw-nrepl-client (nrepl/client connection Long/MAX_VALUE)
        client (make-client tunnel connection raw-nrepl-client)
        response-poller (spawn-response-poller! client connection options)]
    (set-response-poller! client response-poller)
    client))

(defn disconnect! [client & opts]
  (let [{:keys [timeout] :or {timeout 1000}} opts
        connection (get-connenction client)
        response-poller (get-response-poller client)]
    (.close connection)                                                                                                       ; poll-for-responses should gracefully leave its loop
    (when (= (wait-for-response-poller-shutdown client timeout ::timeout) ::timeout)
      (println "forcing response-poller to stop (strange)")
      (doto ^Thread response-poller
        (.stop)))))