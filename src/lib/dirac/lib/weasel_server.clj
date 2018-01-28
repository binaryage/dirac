; original code taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.lib.weasel-server
  (:refer-clojure :exclude [loaded-libs])
  (:require [cljs.repl]
            [cljs.compiler :as cmp]
            [clojure.tools.logging :as log]
            [org.httpkit.server :as http]
            [dirac.lib.ws-server :as server]
            [dirac.lib.utils :as utils])
  (:import (clojure.lang IDeref Atom)))

(def default-opts {:host       "localhost"
                   :port       9001
                   :port-range 10})

; -- readiness helpers ------------------------------------------------------------------------------------------------------

(defonce client-ready-promise (volatile! (promise)))

(defn mark-client-as-ready! []
  (assert (not (realized? @client-ready-promise)))
  (deliver @client-ready-promise true))

(defn mark-client-as-not-ready! []
  (vreset! client-ready-promise (promise)))

(defn get-client-ready-promise []
  @client-ready-promise)

; -- WeaselREPLEnv ----------------------------------------------------------------------------------------------------------

(declare setup-env)
(declare request-eval)
(declare load-javascript)
(declare tear-down-env)

; normally cljs-repl driven by piggieback calls setup/tear-down for each evaluation
; piggieback works around it by wrapping env and doing -setup only once and ignoring -tear-down calls
; this complicated the piggieback implementation so I decided to do it here instead and simplify our version of piggieback
(defrecord WeaselREPLEnv [id options server client-response-promises cached-setup]
  cljs.repl/IJavaScriptEnv
  (-setup [this opts]
    (let [cached-setup-value @(:cached-setup this)]
      (log/trace (str this) "-setup called, cached setup" cached-setup-value)
      (if (= ::uninitialized cached-setup-value)
        (reset! (:cached-setup this) (setup-env this opts))
        cached-setup-value)))
  (-evaluate [this filename line js]
    ; Dirac is normally producing unique synthetic filenames, e.g. repl://dirac-repl/dirac/bbbc0eea-1/repl-job-000006.cljs
    ; so we assume we can use it to form unique eval-id to track evaluation life-cycle
    ; this is a hack: I don't want to break WeaselREPLEnv contract
    (let [eval-id (str (or filename "<unknown>") (if (some? line) (str ":" line)))]
      (log/trace (str this) "-evaluate called" eval-id "\n" js)
      (request-eval this eval-id js filename)))
  (-load [this provides url]
    (log/trace (str this) "-load called" (str this) provides url)
    (load-javascript this provides url))
  (-tear-down [this]
    (if (= :tear-down @(:cached-setup this))
      (do
        (log/trace (str this) "-tear-down called => shutting down the env")
        (reset! cached-setup ::uninitialized)
        (tear-down-env this))
      (log/trace (str this) "-tear-down called => ignoring")))

  Object
  (toString [this]
    (str "[WeaselREPLEnv#" (:id this) "]")))

; -- WeaselREPLEnv construction ---------------------------------------------------------------------------------------------

(def last-env-id (volatile! 0))

(defn next-env-id! []
  (vswap! last-env-id inc))

(defn make-weasel-repl-env
  "Returns a JS environment to be passed to REPL or Piggieback."
  [options]
  (let [effective-options (merge default-opts options)
        repl-env (WeaselREPLEnv. (next-env-id!) effective-options (atom nil) (atom nil) (atom ::uninitialized))]
    (log/trace "Made" (str repl-env))
    repl-env))

; -- WeaselREPLEnv getters/setters ------------------------------------------------------------------------------------------

(defn get-server [env]
  {:pre [(instance? WeaselREPLEnv env)]}
  (let [server-atom (:server env)]
    (assert server-atom)
    (assert (instance? Atom server-atom))
    @server-atom))

(defn set-server! [env server]
  {:pre [(instance? WeaselREPLEnv env)]}
  (reset! (:server env) server))

(defn get-client-response-promise [env eval-id]
  {:pre [(instance? WeaselREPLEnv env)
         (some? eval-id)]}
  (let [client-response-promises-atom (:client-response-promises env)]
    (assert (some? client-response-promises-atom))
    (assert (instance? Atom client-response-promises-atom))
    (get @client-response-promises-atom eval-id)))

(defn swap-client-response-promise! [env eval-id f & args]
  (let [client-response-promises-atom (:client-response-promises env)]
    (assert (some? client-response-promises-atom))
    (assert (instance? Atom client-response-promises-atom))
    (swap! client-response-promises-atom (fn [state]
                                           (if-some [new-promise (apply f (get state eval-id) args)]
                                             (assoc state eval-id new-promise)
                                             (dissoc state eval-id))))))

(defn reset-client-response-promise! [env eval-id new-promise]
  (swap-client-response-promise! env eval-id (constantly new-promise)))

; -- message builders -------------------------------------------------------------------------------------------------------

(defn make-occupied-error-message []
  {:op   :error
   :type :occupied})

(defn make-eval-js-request-message [eval-id js & [filename]]
  (cond-> {:op      :eval-js
           :eval-id eval-id
           :code    js}
          (some? filename) (merge {:file filename})))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message (fn [_env msg] (:op msg)))

(defmethod process-message :default [env message]
  (log/debug (str env) "Received unrecognized message:\n" (utils/pp message)))

(defmethod process-message :result [env message]
  (let [result (:value message)
        eval-id (:eval-id message)
        client-response-promise (get-client-response-promise env eval-id)]
    (when client-response-promise                                                                                             ; silently ignore results delivered after timeout, TODO: maybe warn in log?
      (assert (instance? IDeref client-response-promise))
      (deliver client-response-promise result))))

(defmethod process-message :ready [env message]
  (log/debug (str env) "Received :ready message:\n" (utils/pp message))
  (if-let [ident (:ident message)]
    (log/debug (str env) (str "Client identified as '" ident "'")))
  (mark-client-as-ready!))

(defmethod process-message :error [env message]
  (log/error (str env) "DevTools reported error:\n" (utils/pp message)))

; -- env helpers ------------------------------------------------------------------------------------------------------------

(defn promise-new-client-response! [env eval-id]
  {:pre [(instance? WeaselREPLEnv env)
         (some? eval-id)]}
  (log/trace (str env) (str "Create promised response for eval " eval-id " ..."))
  (reset-client-response-promise! env eval-id (promise)))

(defn wait-for-promised-response! [env eval-id]
  {:pre [(instance? WeaselREPLEnv env)
         (some? eval-id)]}
  (let [response-promise (get-client-response-promise env eval-id)]
    (assert (some? response-promise) (str "expected some pending promise for eval " eval-id))
    (assert (instance? IDeref response-promise))
    (log/trace (str env) (str "Waiting for promised response for eval " eval-id " ..."))
    (let [response @response-promise]                                                                                         ; <===== WILL BLOCK! TODO: implement a timeout
      (log/trace (str env) (str "Got promised response for eval " eval-id))
      (reset-client-response-promise! env eval-id nil)
      response)))

(defn send-occupied-response-close-channel-and-reject-client! [env channel]
  (log/debug (str env) "Client already connected. Rejecting new client with occupied message on channel" channel)
  (http/send! channel (server/serialize-msg (make-occupied-error-message)))
  (http/close channel)
  :reject)

(defn on-client-connection [env server channel]
  ; we allow only one client connection at a time
  (if (server/has-clients? server)
    (send-occupied-response-close-channel-and-reject-client! env channel)
    (do
      (log/debug (str env) "A client connected" channel)
      (mark-client-as-not-ready!))))

(defn on-message [env _server _client message]
  ; we don't need to pass server and client into process-message
  ; because we allow only one client connection and server is stored in the env if needed
  (process-message env message))

; -- WeaselREPLEnv implementation -------------------------------------------------------------------------------------------

(defn setup-env [env _opts]
  (let [options (:options env)
        {:keys [after-launch]} options
        server-options (assoc options
                         :on-message (partial on-message env)
                         :on-client-connection (partial on-client-connection env))
        server (server/create! server-options)
        server-url (server/get-url server)]
    (set-server! env server)
    (log/debug (str env) (str "Weasel server started at " server-url "."))
    (if after-launch
      (after-launch env server-url))
    nil))

(defn tear-down-env [env]
  (log/trace "Destroying" (str env))
  (server/destroy! (get-server env))
  (log/debug (str env) "Weasel server stopped."))

(defn request-eval [env eval-id js & [filename]]
  (promise-new-client-response! env eval-id)
  (let [client @(server/get-first-client-promise (get-server env))                                                            ; <===== MIGHT BLOCK if there is currently no client connected TODO: implement timeout
        ready? @(get-client-ready-promise)]                                                                                   ; <===== MIGHT BLOCK until we receive client :ready signal
    (assert ready?)
    (server/send! client (make-eval-js-request-message eval-id js filename)))
  (wait-for-promised-response! env eval-id))                                                                                  ; <===== WILL BLOCK! until client responds

(defonce load-javascript-counter-atom (atom 0))

(defn load-javascript [env provides _]
  (let [counter (swap! load-javascript-counter-atom inc)
        eval-id (str "<load-javascript-" counter ">")
        js (str "goog.require('" (cmp/munge (first provides)) "')")]
    (request-eval env eval-id js)))                                                                                           ; what is this?
