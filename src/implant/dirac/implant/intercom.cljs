(ns dirac.implant.intercom
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan put! timeout close!]]
            [cljs.reader :refer [read-string]]
            [dirac.implant.console :as console]
            [dirac.implant.weasel-client :as weasel-client]
            [dirac.implant.nrepl-tunnel-client :as nrepl-tunnel-client]
            [dirac.utils :as utils]
            [chromex.logging :refer-macros [log info warn error]]
            [dirac.implant.eval :as eval]))

(def required-dirac-api-version 1)

(def ^:dynamic *repl-connected* false)
(def ^:dynamic *repl-bootstrapped* false)
(def ^:dynamic *last-prompt-status-content* "")
(def ^:dynamic *last-prompt-status-style* "")
(def ^:dynamic *last-prompt-status-banner* "")
(def ^:dynamic *last-connection-url* nil)
(def ^:dynamic *last-connect-fn-id* 0)

(defn ^:dynamic missing-cljs-devtools-message []
  (str "Dirac DevTools requires runtime support from the page context.\n"
       "Please <a href=\"https://github.com/binaryage/dirac#installation\">install cljs-devtools</a> into your app."))

(defn ^:dynamic old-cljs-devtools-message [current-api required-api]
  (str "Obsolete cljs-devtools version detected. Dirac DevTools requires Dirac API v" required-api ", "
       "but your cljs-devtools is v" current-api ".\n"
       "Please ugrade your cljs-devtools installation in page => https://github.com/binaryage/cljs-devtools."))

(defn ^:dynamic failed-to-retrieve-client-config-message [where]
  (str "Failed to retrive client-side Dirac config (" where "). This is an unexpected error."))

(defn ^:dynamice unable-to-bootstrap-message []
  (str "Unable to bootstrap CLJS REPL due to a timeout. This is usually a case when server side process "
       "raised an exception or crashed. Check your nREPL console."))

(defn ^:dynamic bootstrap-error-message []
  (str "Unable to bootstrap CLJS REPL due to an error. Check your nREPL console."))

(defn ^:dynamic unable-to-connect-exception-message [url e]
  (str "Unable to connect to Dirac Agent at " url ":\n" e))

(defn ^:dynamic will-reconnect-banner-message [remaining-time]
  (str "will try reconnect in " remaining-time " seconds"))

(defn ^:dynamic dirac-agent-disconnected-message [tunnel-url]
  (str "<b>Dirac Agent is not listening</b> at " tunnel-url " "
       "(<a href=\"https://github.com/binaryage/dirac#start-dirac-agent\">need help?</a>)."))

(defn ^:dynamic dirac-agent-connected-message []
  (str "Dirac Agent connected. Bootstrapping cljs REPL..."))

; -- prompt status ----------------------------------------------------------------------------------------------------------

(defn repl-ready? []
  (and *repl-connected*
       *repl-bootstrapped*))

(defn update-repl-mode! []
  (if (repl-ready?)
    (console/set-prompt-mode! :edit)
    (console/set-prompt-mode! :status))
  (console/set-prompt-status-content! *last-prompt-status-content*)
  (console/set-prompt-status-style! *last-prompt-status-style*)
  (console/set-prompt-status-banner! *last-prompt-status-banner*))

(defn update-prompt-banner [banner]
  (set! *last-prompt-status-banner* banner)
  (console/set-prompt-status-banner! *last-prompt-status-banner*))

(defn display-prompt-status [status & [style]]
  (let [effective-style (or style :error)]
    (update-prompt-banner "")
    (set! *last-prompt-status-content* status)
    (set! *last-prompt-status-style* effective-style)
    (console/set-prompt-status-content! *last-prompt-status-content*)
    (console/set-prompt-status-style! effective-style)
    (console/set-prompt-mode! :status)))

(defn on-client-change [_key _ref _old new]
  (if (nil? new)
    (do
      (display-prompt-status (dirac-agent-disconnected-message *last-connection-url*))
      (set! *repl-bootstrapped* false)
      (set! *repl-connected* false))
    (do
      (display-prompt-status (dirac-agent-connected-message) :info)
      (set! *repl-connected* true)))
  (update-repl-mode!))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn init! []
  (add-watch nrepl-tunnel-client/current-client ::client-observer on-client-change))

(defn connect-to-weasel-server! [url]
  (go
    (if-let [client-config (<! (eval/get-dirac-client-config))]
      (do
        (let [weasel-options (utils/remove-nil-values {:verbose?        (:dirac-weasel-verbose client-config)
                                                       :auto-reconnect? (:dirac-weasel-auto-reconnect client-config)
                                                       :pre-eval-delay  (:dirac-weasel-pre-eval-delay client-config)})]
          (info (str "Connecting to a weasel server at " url ". Weasel options:") weasel-options)
          (weasel-client/connect! url weasel-options)))
      (display-prompt-status (failed-to-retrieve-client-config-message "in connect-to-weasel-server!")))))

(defn on-error-handler [url _client _event]
  (display-prompt-status (str "Unable to connect to Dirac Agent at " url)))

(defn next-connect-fn [attempt]
  (set! *last-connect-fn-id* (inc *last-connect-fn-id*))
  (let [id *last-connect-fn-id*
        step 1000
        time (utils/exponential-backoff-ceiling attempt)
        prev-time (utils/exponential-backoff-ceiling (dec attempt))
        time-in-seconds (int (/ prev-time step))]
    (go-loop [remaining-time time-in-seconds]
      (when (pos? remaining-time)
        (update-prompt-banner (will-reconnect-banner-message remaining-time))
        (<! (timeout step))
        (if (= id *last-connect-fn-id*)
          (recur (dec remaining-time)))))
    time))

(defn connect-to-nrepl-tunnel-server [url verbose? auto-reconnect? response-timeout]
  {:pre [(string? url)]}
  (when-not *last-connection-url*
    (set! *last-connection-url* url)
    (try
      (let [tunnel-options (utils/remove-nil-values {:on-error          (partial on-error-handler url)
                                                     :next-reconnect-fn next-connect-fn
                                                     :verbose?          verbose?
                                                     :auto-reconnect?   auto-reconnect?
                                                     :response-timeout  response-timeout})]
        (info (str "Connecting to a nREPL tunnel at " url ". Tunnel options:") tunnel-options)
        (nrepl-tunnel-client/connect! url tunnel-options))
      (catch :default e
        (display-prompt-status (unable-to-connect-exception-message url e))
        (throw e)))))

(defn send-eval-request! [job-id code]
  (when (repl-ready?)
    (console/announce-job-start! job-id (str "eval: " code))
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
              agent-url (ws-url dirac-agent-host dirac-agent-port)
              verbose? (:dirac-agent-verbose client-config)
              auto-reconnect? (:dirac-agent-auto-reconnect client-config)
              response-timeout (:dirac-agent-response-timeout client-config)]
          (connect-to-nrepl-tunnel-server agent-url verbose? auto-reconnect? response-timeout)))
      (display-prompt-status (failed-to-retrieve-client-config-message "in start-repl!")))))

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
      (case (first (:status response))
        "done" (do
                 (set! *repl-bootstrapped* true)
                 (update-repl-mode!)
                 {:op :bootstrap-done})
        "timeout" (do
                    (display-prompt-status (unable-to-bootstrap-message))
                    {:op :bootstrap-timeout})
        (do
          (display-prompt-status (bootstrap-error-message))
          {:op :bootstrap-error})))))

(defmethod nrepl-tunnel-client/process-message :bootstrap-info [_client message]
  (let [{:keys [server-url ns]} message]
    (assert server-url (str "expected :server-url in :bootstrap-info message" message))
    (assert ns (str "expected :ns in :bootstrap-info message" message))
    (console/set-prompt-ns! ns)
    (connect-to-weasel-server! server-url))
  nil)