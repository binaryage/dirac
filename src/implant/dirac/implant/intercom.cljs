(ns dirac.implant.intercom
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan put! timeout close!]]
            [cljs.reader :refer [read-string]]
            [dirac.implant.console :as console]
            [dirac.implant.weasel-client :as weasel-client]
            [dirac.implant.nrepl-tunnel-client :as nrepl-tunnel-client]
            [chromex.logging :refer-macros [log info warn error]]
            [goog.net.WebSocket :as ws]
            [dirac.implant.eval :as eval]))

(def required-dirac-api-version 1)

(def ^:dynamic *repl-connected* false)
(def ^:dynamic *repl-bootstrapped* false)
(def ^:dynamic *last-prompt-status* "")
(def ^:dynamic *last-prompt-banner* "")
(def ^:dynamic *last-connection-url* nil)
(def ^:dynamic *last-connect-fn-id* 0)
(def ^:dynamic *prev-time* 0)

(def weasel-options
  {:verbose true})

(def tunnel-options
  {:verbose         true
   :auto-reconnect? true})

(defn ^:dynamic missing-cljs-devtools-message []
  (str "Dirac DevTools requires runtime support from the page context.\n"
       "Please install cljs-devtools into your app => https://github.com/binaryage/dirac#installation."))

(defn ^:dynamic old-cljs-devtools-message [current-api required-api]
  (str "Obsolete cljs-devtools version detected. Dirac DevTools requires Dirac API v" required-api
       ", but your cljs-devtools is v" current-api ".\n"
       "Please ugrade your cljs-devtools installation in page => https://github.com/binaryage/cljs-devtools."))

(defn ^:dynamic failed-to-retrieve-client-config-message []
  (str "Failed to retrive client-side Dirac config. This is an unexpected error."))

(defn repl-ready? []
  (and *repl-connected*
       *repl-bootstrapped*))

(defn update-repl-mode! []
  (if (repl-ready?)
    (console/set-prompt-mode! "edit")
    (console/set-prompt-mode! "status"))
  (console/set-prompt-status! *last-prompt-status*)
  (console/set-prompt-banner! *last-prompt-banner*))

(defn on-client-change [_key _ref _old new]
  (if (nil? new)
    (do
      (set! *last-prompt-status* (str "Dirac Agent is disconnected. Check your nREPL tunnel at " *last-connection-url* "."))
      (set! *last-prompt-banner* "")
      (set! *repl-bootstrapped* false)
      (set! *repl-connected* false))
    (do
      (set! *last-prompt-status* "Dirac Agent connected. Bootstrapping CLJS REPL...")
      (set! *last-prompt-banner* "")
      (set! *repl-connected* true)))
  (update-repl-mode!))

(defn init! []
  (add-watch nrepl-tunnel-client/current-client ::client-observer on-client-change))

(defn display-prompt-status [status]
  (set! *last-prompt-status* status)
  (console/set-prompt-status! *last-prompt-status*)
  (console/set-prompt-mode! "status"))

(defn update-prompt-banner [banner]
  (set! *last-prompt-banner* banner)
  (console/set-prompt-banner! *last-prompt-banner*))

(defn connect-to-weasel-server [url]
  (weasel-client/connect! url weasel-options))

(defn on-error-handler [url _client event]
  (display-prompt-status (str "Unable to connect to Dirac Agent at " url)))

(defn next-connect-fn [attempt]
  (set! *last-connect-fn-id* (inc *last-connect-fn-id*))
  (let [id *last-connect-fn-id*
        step 1000
        time-in-seconds (int (/ *prev-time* step))]
    (go-loop [remaining-time time-in-seconds]
      (when (pos? remaining-time)
        (update-prompt-banner (str "will try reconnect in " remaining-time " seconds"))
        (<! (timeout step))
        (if (= id *last-connect-fn-id*)
          (recur (dec remaining-time)))))
    (let [time (ws/EXPONENTIAL_BACKOFF_ attempt)]
      (set! *prev-time* time)                                                                                                 ; for some reason websocket fetches one value ahead
      time)))

(defn connect-to-nrepl-tunnel-server [url]
  {:pre [(string? url)]}
  (when-not *last-connection-url*
    (set! *last-connection-url* url)
    (try
      (let [options (assoc tunnel-options
                      :on-error (partial on-error-handler url)
                      :next-reconnect-fn next-connect-fn)]
        (nrepl-tunnel-client/connect! url options))
      (catch :default e
        (display-prompt-status (str "Unable to connect to Dirac Agent at " url ":\n" e))))))

(defn send-eval-request! [job-id code]
  (when (repl-ready?)
    (console/announce-job-start! job-id)
    (nrepl-tunnel-client/tunnel-message! {:op    "eval"
                                          :dirac "wrap"
                                          :id    job-id
                                          :code  code})))

(defn ws-url [host port]
  (str "ws://" host ":" port))

(defn start-repl! []
  (go
    (if-let [client-config (<! (eval/get-dirac-client-config))]
      (do
        (info "Starting REPL support. Dirac client-side config is " client-config)
        (let [{:keys [dirac-agent-host dirac-agent-port]} client-config
              agent-url (ws-url dirac-agent-host dirac-agent-port)]
          (connect-to-nrepl-tunnel-server agent-url)))
      (display-prompt-status (failed-to-retrieve-client-config-message)))))

(defn init-repl! []
  (when-not *last-connection-url*
    (go
      (if (<! (eval/is-devtools-present?))
        (let [api-version (<! (eval/get-dirac-api-version))]
          (if-not (< api-version required-dirac-api-version)
            (start-repl!)
            (display-prompt-status (old-cljs-devtools-message api-version required-dirac-api-version))))
        (display-prompt-status (missing-cljs-devtools-message))))))

; -- message processing -----------------------------------------------------------------------------------------------------

; When we connect to freshly open nREPL session, cljs REPL is not boostrapped (google "nREPL piggieback" for more details).
(defmethod nrepl-tunnel-client/process-message :bootstrap [_client _message]
  (go
    (let [response (<! (nrepl-tunnel-client/tunnel-message-with-response! (nrepl-tunnel-client/boostrap-cljs-repl-message)))]
      (case (:status response)
        ["done"] (do
                   (set! *repl-bootstrapped* true)
                   (update-repl-mode!)
                   {:op :bootstrap-done})
        ["timeout"] (do
                      (display-prompt-status (str "Unable to bootstrap CLJS REPL. Bootstrapping timeout. "
                                                  "This is usually a case when server side process "
                                                  "raised an exception or crashed. Check your nREPL console."))
                      {:op :bootstrap-timeout})
        (do
          (display-prompt-status (str "Unable to bootstrap CLJS REPL due to an error. Check your nREPL console."))
          {:op :bootstrap-error})))))

(defmethod nrepl-tunnel-client/process-message :bootstrap-info [_client message]
  (let [{:keys [server-url ns]} message]
    (assert server-url (str "expected :server-url in :bootstrap-info message" message))
    (assert ns (str "expected :ns in :bootstrap-info message" message))
    (connect-to-weasel-server server-url)
    (console/set-repl-ns! ns))
  nil)