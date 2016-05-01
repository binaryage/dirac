(ns dirac.implant.intercom
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan put! timeout close!]]
            [cljs.reader :refer [read-string]]
            [dirac.implant.console :as console]
            [dirac.implant.weasel-client :as weasel-client]
            [dirac.implant.nrepl-tunnel-client :as nrepl-tunnel-client]
            [dirac.implant.version :as implant-version]
            [dirac.utils :as utils]
            [chromex.logging :refer-macros [log info warn error]]
            [dirac.implant.eval :as eval])
  (:import goog.net.WebSocket.ErrorEvent))

(defonce required-repl-api-version 3)

(defonce ^:dynamic *repl-connected* false)
(defonce ^:dynamic *repl-bootstrapped* false)
(defonce ^:dynamic *last-connection-url* nil)
(defonce ^:dynamic *last-connect-fn-id* 0)

(def dirac-agent-help-url "https://github.com/binaryage/dirac/blob/master/docs/install.md#start-dirac-agent")

(defn ^:dynamic repl-api-mismatch-msg [current-api required-api]
  (str "Dirac Runtime version mismatch detected. Dirac DevTools requires Dirac Runtime REPL API v" required-api ", "
       "but your version is v" current-api ".\n"
       "Please <a href=\"https://github.com/binaryage/dirac\">ugrade Dirac Runtime</a> in your app."))

(defn ^:dynamic failed-to-retrieve-client-config-msg [where]
  (str "Failed to retrive Dirac Runtime config (" where "). This is an unexpected error."))

(defn ^:dynamice unable-to-bootstrap-msg []
  (str "Unable to bootstrap ClojureScript REPL due to a timeout.\n"
       "This is usually a case when server side process raised an exception or crashed.\n"
       "Check your Dirac Agent server console."))

(defn ^:dynamic bootstrap-error-msg [details]
  (str "Unable to bootstrap ClojureScript REPL due to an error.\n"
       (if (some? details) (str details "\n"))
       "Please check your Dirac Agent console for additional output."))

(defn ^:dynamic unable-to-connect-exception-msg [url e]
  (str "Unable to connect to Dirac Agent at " url ":\n"
       e))

(defn ^:dynamic dirac-agent-disconnected-msg [tunnel-url]
  (str "<b>Dirac Agent is not listening</b> at " tunnel-url " "
       "(<a href=\"" dirac-agent-help-url "\">need help?</a>)."))

(defn ^:dynamic dirac-agent-connected-msg []
  (str "Dirac Agent connected. Bootstrapping ClojureScript REPL..."))

(defn ^:dynamic will-reconnect-banner-msg [remaining-time]
  (str "will try reconnect in " remaining-time " seconds"))

(defn ^:dynamic version-mismatch-msg [devtools-version agent-version]
  (str "Version mismatch: "
       "Dirac Agent has different version (" agent-version ") "
       "than Dirac DevTools Extension (" devtools-version ").\n"
       "To avoid compatibility issues, please upgrade all Dirac components to the same version.\n"
       "=> https://github.com/binaryage/dirac#installation"))

(defn ^:dynamic repl-support-not-enabled-msg []
  (str "Dirac Runtime is present, but the :repl feature hasn't been enabled. "
       "Please install Dirac Runtime with REPL support."))

(defn ^:dynamic warn-version-mismatch [our-version agent-version]
  (let [msg (version-mismatch-msg our-version agent-version)]
    (warn msg)
    (eval/console-warn! msg)))

(defn check-version! [version]
  (if-not (= version implant-version/version)
    (warn-version-mismatch implant-version/version version)))

; -- prompt status ----------------------------------------------------------------------------------------------------------

(defn repl-ready? []
  (and *repl-connected*
       *repl-bootstrapped*))

(defn update-repl-mode! []
  (if (repl-ready?)
    (console/set-prompt-mode! :edit)
    (console/set-prompt-mode! :status)))

(defn display-prompt-status [status & [style]]
  (let [effective-style (or style :error)]
    (console/set-prompt-mode! :status)
    (console/set-prompt-status-banner! "")
    (console/set-prompt-status-content! status)
    (console/set-prompt-status-style! effective-style)))

(defn on-client-change [_key _ref _old new]
  (if (nil? new)
    (do
      (display-prompt-status (dirac-agent-disconnected-msg *last-connection-url*))
      (set! *repl-bootstrapped* false)
      (set! *repl-connected* false))
    (do
      (display-prompt-status (dirac-agent-connected-msg) :info)
      (set! *repl-connected* true)))
  (update-repl-mode!))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn configure-eval! [client-config]
  (eval/update-config! (assoc client-config
                         :display-user-info-fn eval/console-info!
                         :display-user-error-fn eval/console-error!)))

(defn init! []
  (add-watch nrepl-tunnel-client/current-client ::client-observer on-client-change)
  (configure-eval! {}))

(defn connect-to-weasel-server! [url]
  (go
    (if-let [client-config (<! (eval/get-runtime-config))]
      (do
        (let [weasel-options (utils/remove-nil-values {:verbose?        (:weasel-verbose client-config)
                                                       :auto-reconnect? (:weasel-auto-reconnect client-config)
                                                       :pre-eval-delay  (:weasel-pre-eval-delay client-config)})]
          (info (str "Connecting to a weasel server at " url ". Weasel options:") weasel-options)
          (weasel-client/connect! url weasel-options)))
      (display-prompt-status (failed-to-retrieve-client-config-msg "in connect-to-weasel-server!")))))

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
        (console/set-prompt-status-banner! (will-reconnect-banner-msg remaining-time))
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
        (display-prompt-status (unable-to-connect-exception-msg url e))
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
    (if-let [client-config (<! (eval/get-runtime-config))]
      (do
        (info "Starting REPL support. Dirac Runtime config is " client-config)
        (configure-eval! client-config)
        (let [agent-url (ws-url (:agent-host client-config) (:agent-port client-config))
              verbose? (:agent-verbose client-config)
              auto-reconnect? (:agent-auto-reconnect client-config)
              response-timeout (:agent-response-timeout client-config)]
          (connect-to-nrepl-tunnel-server agent-url verbose? auto-reconnect? response-timeout)))
      (display-prompt-status (failed-to-retrieve-client-config-msg "in start-repl!")))))

(defn init-repl! []
  (when-not *last-connection-url*
    (go
      (if (<! (eval/is-runtime-present?))
        (if (<! (eval/is-runtime-repl-support-installed?))
          (let [repl-api-version (<! (eval/get-runtime-repl-api-version))]
            (if (= repl-api-version required-repl-api-version)
              (start-repl!)
              (display-prompt-status (repl-api-mismatch-msg repl-api-version required-repl-api-version))))
          (display-prompt-status (repl-support-not-enabled-msg)))
        (display-prompt-status (eval/missing-runtime-msg))))))

; -- message processing -----------------------------------------------------------------------------------------------------

; When we connect to a freshly open nREPL session, CLJS REPL is not boostrapped yet.
; Normally user enters something like "(cemerick.piggieback/cljs-repl ...)" into his nREPL Clojure session to enter CLJS REPL.
; Because we have control over nREPL process thanks to our middleware, we can automate this process.
; We send a bootstrap message with request to enter CLJS REPL on user's behalf
; (google "nREPL piggieback" for more details).
(defmethod nrepl-tunnel-client/process-message :bootstrap [_client message]
  (check-version! (:version message))
  (go
    (let [runtime-tag (<! (eval/get-runtime-tag))
          bootstrap-message (nrepl-tunnel-client/make-boostrap-message runtime-tag)
          response (<! (nrepl-tunnel-client/tunnel-message-with-response! bootstrap-message))]
      (case (first (:status response))
        "done" (do
                 (log "Bootstrap done" response)
                 (set! *repl-bootstrapped* true)
                 (update-repl-mode!)
                 {:op :bootstrap-done})
        "timeout" (do
                    (error "Bootstrap timeouted" response)
                    (display-prompt-status (unable-to-bootstrap-msg))
                    {:op :bootstrap-timeout})
        (do
          (error "Bootstrap failed" response)
          (display-prompt-status (bootstrap-error-msg (or (:details response) response)))
          {:op :bootstrap-error})))))

(defmethod nrepl-tunnel-client/process-message :bootstrap-info [_client message]
  (let [{:keys [weasel-url ns]} message]
    (assert weasel-url (str "expected :weasel-url in :bootstrap-info message" message))
    (assert ns (str "expected :ns in :bootstrap-info message" message))
    (console/set-prompt-ns! ns)
    (connect-to-weasel-server! weasel-url))
  nil)