(ns dirac.agent.nrepl-client
  (require [clojure.tools.nrepl :as nrepl]
           [clojure.tools.nrepl.transport :as nrepl.transport]
           [dirac.agent.nrepl-protocols :as nrepl-protocols]))

(def response-poller (atom nil))

(defn make-client [connection nrepl-client #_session]
  {:connection   connection
   :nrepl-client nrepl-client
   ;:session      session
   })

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

;(defn send! [client session message]
;  (let [session (get-session client)
;        nrepl-client (get-nrepl-client client)
;        session-sender (nrepl/client-session nrepl-client :session session)]
;    (session-sender message)))

(defn send! [client message]
  (let [nrepl-client (get-nrepl-client client)]
    (nrepl/message nrepl-client message)))

(defn open-session [client]
  (let [nrepl-client (get-nrepl-client client)]
    (nrepl/new-session nrepl-client)))

(defn close-session [client session]
  (let [nrepl-client (get-nrepl-client client)]
    (nrepl/message nrepl-client {:op "close" :session session})))

(defn set-default-options [options]
  options)

(defn poll-for-responses [tunnel options connection]
  (loop []
    (if-let [response (nrepl.transport/recv connection)]
      (do
        (nrepl-protocols/deliver-message-to-client! tunnel response)
        (recur))
      (println "leaving poll-for-responses loop"))))

(defn connect! [tunnel options]
  (let [connection (connect-with-options options)
        nrepl-client (nrepl/client connection Long/MAX_VALUE)
        ;session (nrepl/new-session nrepl-client)
        ;_ (println "did session" session nrepl-client)
        ;session2 (nrepl/new-session nrepl-client)
        ;_ (println "did session2" session2 nrepl-client)
        client (make-client connection nrepl-client #_session)]
    (let [options (set-default-options options)]
      (let [^Runnable operation (bound-fn [] (poll-for-responses tunnel options connection))]
        (reset! response-poller (Thread. operation)))
      (doto ^Thread @response-poller
        (.setName "nREPL client - response poller")
        (.setDaemon true)
        (.start))
      client)))