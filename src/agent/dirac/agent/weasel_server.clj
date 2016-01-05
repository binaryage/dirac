; taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.agent.weasel-server
  (:refer-clojure :exclude [loaded-libs])
  (:require [cljs.repl]
            [cljs.compiler :as cmp]
            [dirac.agent.ws-server :as server]))

(def default-opts {:ip   "127.0.0.1"
                   :port 9001})

(def repl-out (atom nil))                                                                                                     ; stores the value of *out* when the server is started

(def client-response (atom nil))                                                                                              ; stores a promise fulfilled by a client's eval response

(def weasel-server (atom nil))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message (fn [_ msg] (:op msg)))

(defmethod process-message :result [_ message]
  (let [result (:value message)]
    (when-not (nil? @client-response)
      (deliver @client-response result))))

(defmethod process-message :print [_ message]
  (let [string (:value message)]
    (binding [*out* (or @repl-out *out*)]
      (print (read-string string)))))

(defmethod process-message :ready [_ _])

(defmethod process-message :error [_ message]
  (println "DevTools reported error" message))

; -- request handling -------------------------------------------------------------------------------------------------------

(defn websocket-setup-env [this _opts]
  (reset! repl-out *out*)
  (let [server (server/start! (fn [data] (process-message this data)) (select-keys this [:ip :port]))
        {:keys [ip pre-connect]} this]
    (reset! weasel-server server)
    (let [port (-> (server/get-http-server server) meta :local-port)]
      (println (str "started Dirac Weasel Server on ws://" ip ":" port " and waiting for DevTools to connect"))
      (flush))
    (when pre-connect (pre-connect))
    (server/wait-for-client server)))

(defn websocket-tear-down-env []
  (reset! repl-out nil)
  (server/stop! @weasel-server)
  (println "<< stopped server >>"))

(defn send-for-eval! [js]
  (server/send! @weasel-server {:op :eval-js, :code js}))

(defn websocket-eval [js]
  (reset! client-response (promise))
  (send-for-eval! js)
  (let [ret @@client-response]
    (reset! client-response nil)
    ret))

(defn load-javascript [_ provides _]
  (websocket-eval
    (str "goog.require('" (cmp/munge (first provides)) "')")))

; -- request handling -------------------------------------------------------------------------------------------------------

(defrecord WebsocketEnv []
  cljs.repl/IJavaScriptEnv
  (-setup [this opts] (websocket-setup-env this opts))
  (-evaluate [_ _ _ js] (websocket-eval js))
  (-load [this ns url] (load-javascript this ns url))
  (-tear-down [_] (websocket-tear-down-env)))

; -- REPL env ---------------------------------------------------------------------------------------------------------------

(defn repl-env
  "Returns a JS environment to pass to repl or piggieback"
  [& {:as opts}]
  (merge (WebsocketEnv.) default-opts opts))