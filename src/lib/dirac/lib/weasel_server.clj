; original code taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.lib.weasel-server
  (:refer-clojure :exclude [loaded-libs])
  (:require [cljs.compiler :as cmp]
            [cljs.repl]
            [clojure.tools.logging :as log]
            [dirac.lib.utils :as utils]
            [dirac.lib.ws-server :as server]
            [org.httpkit.server :as http])
  (:use [com.rpl.specter])
  (:import (clojure.lang Atom IDeref)))

(def default-opts {:host       "localhost"
                   :port       9001
                   :port-range 10})

; -- WeaselREPLEnv ----------------------------------------------------------------------------------------------------------

(declare setup-env)
(declare request-eval)
(declare load-javascript)
(declare tear-down-env)

(def initial-env-state {:client-ready-promise     nil
                        :last-eval-id             0
                        :client-response-promises {}})

; normally cljs-repl driven by piggieback calls setup/tear-down for each evaluation
; piggieback works around it by wrapping env and doing -setup only once and ignoring -tear-down calls
; this complicated the piggieback implementation so I decided to do it here instead and simplify our version of piggieback
(defrecord WeaselREPLEnv [id options server state cached-setup]
  cljs.repl/IJavaScriptEnv
  (-setup [env opts]
    (let [current-setup (:cached-setup env)
          current-setup-value @current-setup]
      (log/trace (str env) "-setup called, cached setup" current-setup-value)
      (if (= current-setup-value :uninitialized)
        (reset! current-setup (setup-env env opts))
        current-setup-value)))
  (-evaluate [env filename line js]
    (log/trace (str env) (str "-evaluate called for " filename ":" line "\n" js))
    (request-eval env js filename))
  (-load [env provides url]
    (log/trace (str env) "-load called" (str env) provides url)
    (load-javascript env provides url))
  (-tear-down [env]
    (if (::perform-teardown env)                                                                                              ; see evaluate!*
      (let [current-setup (:cached-setup env)
            current-setup-value @current-setup]
        (log/trace (str env) "-tear-down called => shutting down the env")
        ; sometimes we enter imbalanced tear-down request
        ; this happens when someone/something issues :cljs/quit before our env is fully setup
        ; see https://github.com/binaryage/dirac/issues/67
        (if (not= current-setup-value :initialized)
          (log/trace (str env) "  env is not initialized => ignoring")
          (reset! current-setup (tear-down-env env)))
        (log/trace (str env) "-tear-down called => ignoring"))))

  Object
  (toString [this]
    (str "[WeaselREPLEnv#" (:id this) "]")))

; -- WeaselREPLEnv construction ---------------------------------------------------------------------------------------------

(defonce last-env-id (volatile! 0))

(defn next-env-id! []
  (vswap! last-env-id inc))

(defn make-weasel-repl-env
  "Returns a JS environment to be passed to REPL or Piggieback."
  [options]
  (let [effective-options (merge default-opts options)
        repl-env (WeaselREPLEnv. (next-env-id!) effective-options (atom nil) (atom initial-env-state) (atom :uninitialized))]
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

(defn get-state-atom [env]
  {:pre [(instance? WeaselREPLEnv env)]}
  (let [state-atom (:state env)]
    (assert (some? state-atom))
    (assert (instance? Atom state-atom))
    state-atom))

(defn get-client-response-promise [env eval-id]
  {:pre [(instance? WeaselREPLEnv env)
         (some? eval-id)]}
  (let [state-atom (get-state-atom env)]
    (select-one [:client-response-promises eval-id] @state-atom)))

(defn swap-client-response-promise! [env eval-id f & args]
  {:pre [(instance? WeaselREPLEnv env)
         (some? eval-id)]}
  (let [state-atom (get-state-atom env)
        sf (fn [val]
             (if-some [result (apply f val args)]
               result
               NONE))]
    (swap! state-atom #(transform [:client-response-promises eval-id] sf %))))

(defn reset-client-response-promise! [env eval-id new-promise]
  {:pre [(instance? WeaselREPLEnv env)
         (some? eval-id)]}
  (swap-client-response-promise! env eval-id (constantly new-promise)))

(defn get-client-ready-promise [env]
  (let [state-atom (get-state-atom env)]
    (select-one [:client-ready-promise] @state-atom)))

(defn set-client-ready-promise! [env new-val]
  (let [state-atom (get-state-atom env)]
    (swap! state-atom #(setval [:client-ready-promise] new-val %))))

(defn mark-client-as-ready! [env]
  (let [client-ready-promise (get-client-ready-promise env)]
    (assert (some? client-ready-promise))
    (assert (not (realized? client-ready-promise)))
    (deliver client-ready-promise true)))

(defn promise-client-readiness! [env]
  (let [client-ready-promise (get-client-ready-promise env)]
    (assert (nil? client-ready-promise))
    (set-client-ready-promise! env (promise))))

(defn reset-client-readiness! [env]
  (let [client-ready-promise (get-client-ready-promise env)]
    (assert (some? client-ready-promise))
    (set-client-ready-promise! env nil)))

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
        eval-id (:eval-id message)]
    (if-some [client-response-promise (get-client-response-promise env eval-id)]
      (deliver client-response-promise result)
      (log/warn (str "Received eval result without matching eval-id #" eval-id)))))

(defmethod process-message :ready [env message]
  (log/debug (str env) "Received :ready message:\n" (utils/pp message))
  (when-some [ident (:ident message)]
    (log/debug (str env) (str "Client identified as '" ident "'")))
  (mark-client-as-ready! env))

(defmethod process-message :error [env message]
  (log/error (str env) "DevTools reported error:\n" (utils/pp message)))

; -- env helpers ------------------------------------------------------------------------------------------------------------

(defn generate-new-eval-id [env]
  {:pre [(instance? WeaselREPLEnv env)]}
  (let [state-atom (get-state-atom env)]
    (select-one [:last-eval-id] (swap! state-atom #(transform [:last-eval-id] inc %)))))

(defn promise-new-client-response! [env eval-id]
  {:pre [(instance? WeaselREPLEnv env)
         (some? eval-id)]}
  (log/trace (str env) (str "Create promised response for eval #" eval-id " ..."))
  (reset-client-response-promise! env eval-id (promise)))

(defn wait-for-promised-response! [env eval-id]
  {:pre [(instance? WeaselREPLEnv env)
         (some? eval-id)]}
  (let [response-promise (get-client-response-promise env eval-id)]
    (assert (some? response-promise) (str "expected some pending promise for eval #" eval-id))
    (assert (instance? IDeref response-promise))
    (log/trace (str env) (str "Waiting for promised response for eval #" eval-id " ..."))
    (let [response @response-promise]                                                                                         ; <===== WILL BLOCK! TODO: implement a timeout
      (log/trace (str env) (str "Got promised response for eval #" eval-id))
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
    (log/debug (str env) "A client connected" channel)))

(defn on-message [env _server _client message]
  ; we don't need to pass server and client into process-message
  ; because we allow only one client connection and server is stored in the env if needed
  (process-message env message))

(defn wait-for-client-to-get-ready! [env]
  (let [client-ready-promise (get-client-ready-promise env)]
    (assert (some? client-ready-promise))
    @client-ready-promise))

; -- WeaselREPLEnv implementation -------------------------------------------------------------------------------------------

(defn setup-env [env _opts]
  (promise-client-readiness! env)
  (let [options (:options env)
        {:keys [after-launch]} options
        server-options (assoc options
                         :on-message (partial on-message env)
                         :on-client-connection (partial on-client-connection env))
        server (server/create! server-options)
        server-url (server/get-url server)]
    (set-server! env server)
    (log/debug (str env) (str "Weasel server started at " server-url "."))
    (when (some? after-launch)
      (after-launch env server-url))
    :initialized))

(defn tear-down-env [env]
  (log/trace "Destroying" (str env))
  (server/destroy! (get-server env))
  (reset-client-readiness! env)
  (log/debug (str env) "Weasel server stopped.")
  :uninitialized)

(defn request-eval [env js & [filename]]
  (let [eval-id (generate-new-eval-id env)]
    (promise-new-client-response! env eval-id)
    (let [client @(server/get-first-client-promise (get-server env))]                                                         ; <===== MIGHT BLOCK if there is currently no client connected TODO: implement timeout
      (wait-for-client-to-get-ready! env)                                                                                     ; <===== MIGHT BLOCK until we receive client :ready signal
      (server/send! client (make-eval-js-request-message eval-id js filename)))
    (wait-for-promised-response! env eval-id)))                                                                               ; <===== WILL BLOCK! until client responds

(defn load-javascript [env provides _]
  (let [js (str "goog.require('" (cmp/munge (first provides)) "')")]
    (request-eval env js)))                                                                                                   ; what is this?
