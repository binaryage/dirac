(ns dirac.agent.nrepl-client
  (require [clojure.tools.nrepl :as nrepl]
           [clojure.tools.nrepl.transport :as nrepl.transport]
           [dirac.agent.nrepl-protocols :as nrepl-protocols]))

(def response-poller (atom nil))

(defn make-client [connection nrepl-client session]
  {:connection   connection
   :nrepl-client nrepl-client
   :session      session})

(defn get-connenction [client]
  (:connection client))

(defn get-session [client]
  (:session client))

(defn get-nrepl-client [client]
  (:nrepl-client client))

(defn- url-for [host port]
  (format "nrepl://%s:%s" (or host "localhost") port))

(defn connect-with-options [{:keys [host port]}]
  (let [url (url-for host port)]
    (nrepl/url-connect url)))

(defn send! [client message]
  (let [session (get-session client)
        nrepl-client (get-nrepl-client client)
        session-sender (nrepl/client-session nrepl-client :session session)]
    (session-sender message)))

(defn set-default-options [options]
  options)

(defn poll-for-responses [tunnel options connection]
  (loop []
    (if (try
          (when-let [{:keys [out err] :as resp} (nrepl.transport/recv connection 100)]
            (println "RESP" resp)
            (nrepl-protocols/deliver-client-message! tunnel resp))
          true
          (catch Throwable t
            (println "problem processing response")
            ;(notify-all-queues-of-error t)
            ;(when (System/getenv "DEBUG") (clojure.repl/pst t))
            false))
      (recur)
      (println "leaving poll-for-responses"))))

(defn connect! [tunnel options]
  (let [connection (connect-with-options options)
        nrepl-client (nrepl/client connection Long/MAX_VALUE)
        session (nrepl/new-session nrepl-client)
        client (make-client connection nrepl-client session)]
    (let [options (set-default-options options)]
      (let [^Runnable operation (bound-fn [] (poll-for-responses tunnel options connection))]
        (reset! response-poller (Thread. operation)))
      (doto ^Thread @response-poller
        (.setName "nREPL client - response poller")
        (.setDaemon true)
        (.start))
      client)))