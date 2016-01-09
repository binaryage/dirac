; original code taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.agent.weasel-server
  (:refer-clojure :exclude [loaded-libs])
  (:require [cljs.repl]
            [cljs.compiler :as cmp]
            [clojure.tools.logging :as log]
            [org.httpkit.server :as http]
            [dirac.agent.ws-server :as server])
  (:import (clojure.lang IDeref Atom)))

(declare get-client-response-promise-atom)

(def default-opts {:ip   "127.0.0.1"
                   :port 9001})

(defn get-real-port [server]
  (-> (server/get-http-server server) meta :local-port))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message (fn [_env msg] (:op msg)))

(defmethod process-message :default [_env message]
  (println "dirac.agent.weasel-server: Received unrecognized message" message))

(defmethod process-message :result [env message]
  (let [result (:value message)
        client-response-promise @(get-client-response-promise-atom env)]
    (when-not (nil? client-response-promise)                                                                                  ; silently ignore results delivered after timeout, TODO: implement id matching or something here
      (assert (instance? IDeref client-response-promise))
      (deliver client-response-promise result))))

(defmethod process-message :ready [_env _message])

(defmethod process-message :error [_env message]
  (println "dirac.agent.weasel-server: DevTools reported error" message))

; -- env helpers ------------------------------------------------------------------------------------------------------------

(defn get-server-atom [env]
  (let [server-atom (:server-atom env)]
    (assert server-atom)
    (assert (instance? Atom server-atom))
    server-atom))

(defn get-server [env]
  (let [server @(get-server-atom env)]
    (assert server)
    server))

(defn set-server! [env server]
  (let [server-atom (get-server-atom env)]
    (reset! server-atom server)))

(defn get-client-response-promise-atom [env]
  (let [client-response-promise-atom (:client-response-promise-atom env)]
    (assert client-response-promise-atom)
    (assert (instance? Atom client-response-promise-atom))
    client-response-promise-atom))

(defn promise-new-client-response! [env]
  (let [response-promise-atom (get-client-response-promise-atom env)]
    (assert (instance? Atom response-promise-atom))
    (assert (nil? @response-promise-atom) "promise-new-client-response! previous response promise pending")
    (reset! response-promise-atom (promise))))

(defn wait-for-promised-response! [env]
  (let [response-promise-atom (get-client-response-promise-atom env)]
    (assert (instance? Atom response-promise-atom))
    (let [response-promise @response-promise-atom]
      (assert response-promise "wait-for-promised-response! expected non-nil pending promise")
      (assert (instance? IDeref response-promise))
      (let [response @response-promise]                                                                                       ; <===== WILL BLOCK! TODO: implement a timeout
        (reset! response-promise-atom nil)
        response))))

(defn send-occupied-response-and-close! [channel]
  (http/send! channel (server/serialize-msg {:op   :error
                                             :type :occupied}))
  (http/close channel))

(defn on-client-connection [server channel]
  ; we allow only one client connection at a time
  (if-not (server/has-clients? server)
    true
    (do
      (send-occupied-response-and-close! channel)
      false)))

(defn setup-env [env _opts]
  (let [server-options (merge
                         (select-keys env [:ip :port])
                         {:port-range           10
                          :on-message           (fn [_server _client message]
                                                  (process-message env message))
                          :on-client-connection on-client-connection})
        server (server/create! server-options)
        {:keys [ip pre-connect]} env]
    (set-server! env server)
    (let [port (get-real-port server)]
      (println (str "Started Dirac Weasel Server on ws://" ip ":" port " and waiting for Dirac DevTools to connect..."))
      (flush)
      (if pre-connect
        (pre-connect env ip port))
      (server/wait-for-first-client server)
      env)))

(defn tear-down-env [env]
  (server/destroy! (get-server env))
  (println "<< stopped server >>"))

(defn request-eval [env js]
  (promise-new-client-response! env)
  (server/send! @(server/get-first-client-promise (get-server env)) {:op :eval-js, :code js})                                 ; <===== MIGHT BLOCK if there is currently no client connected TODO: implement timeout
  (wait-for-promised-response! env))                                                                                          ; <===== WILL BLOCK! until client responds

(defn load-javascript [env provides _]
  (request-eval env (str "goog.require('" (cmp/munge (first provides)) "')")))

; -- WeaselREPLEnv ----------------------------------------------------------------------------------------------------------

(defrecord WeaselREPLEnv [server-atom client-response-promise-atom]
  cljs.repl/IJavaScriptEnv
  (-setup [this opts] (setup-env this opts))
  (-evaluate [this _ _ js] (request-eval this js))
  (-load [this ns url] (load-javascript this ns url))
  (-tear-down [this] (tear-down-env this)))

; -- REPL env ---------------------------------------------------------------------------------------------------------------

(defn repl-env
  "Returns a JS environment to be passed to REPL or Piggieback."
  [opts]
  (merge (WeaselREPLEnv. (atom nil) (atom nil)) default-opts opts))
