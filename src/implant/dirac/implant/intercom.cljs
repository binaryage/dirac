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

(def required-dirac-api-version 2)

(def ^:dynamic *repl-connected* false)
(def ^:dynamic *repl-bootstrapped* false)
(def ^:dynamic *last-prompt-mode* :status)
(def ^:dynamic *last-prompt-status-content* "")
(def ^:dynamic *last-prompt-status-style* "")
(def ^:dynamic *last-prompt-status-banner* "")
(def ^:dynamic *last-connection-url* nil)
(def ^:dynamic *last-connect-fn-id* 0)

(defn ^:dynamic old-cljs-devtools-msg [current-api required-api]
  (str "Obsolete cljs-devtools version detected. Dirac DevTools requires Dirac API v" required-api ", "
       "but your cljs-devtools is v" current-api ".\n"
       "Please <a href=\"https://github.com/binaryage/cljs-devtools\">ugrade your cljs-devtools</a> in your app."))

(defn ^:dynamic failed-to-retrieve-client-config-msg [where]
  (str "Failed to retrive client-side Dirac config (" where "). This is an unexpected error."))

(defn ^:dynamice unable-to-bootstrap-msg []
  (str "Unable to bootstrap ClojureScript REPL due to a timeout.\n"
       "This is usually a case when server side process raised an exception or crashed.\n"
       "Check your Dirac Agent server console."))

(defn ^:dynamic bootstrap-error-msg []
  (str "Unable to bootstrap ClojureScript REPL due to an error.\n"
       "Check your Dirac Agent server console."))

(defn ^:dynamic unable-to-connect-exception-msg [url e]
  (str "Unable to connect to Dirac Agent at " url ":\n"
       e))

(defn ^:dynamic dirac-agent-disconnected-msg [tunnel-url]
  (str "<b>Dirac Agent is not listening</b> at " tunnel-url " "
       "(<a href=\"https://github.com/binaryage/dirac#start-dirac-agent\">need help?</a>)."))

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

(defn set-prompt-mode-if-needed! [mode]
  (when-not (= *last-prompt-mode* mode)
    (set! *last-prompt-mode* mode)
    (console/set-prompt-mode! mode)))

(defn set-prompt-status-banner-if-needed! [banner]
  (when-not (= *last-prompt-status-banner* banner)
    (set! *last-prompt-status-banner* banner)
    (console/set-prompt-status-banner! banner)))

(defn set-prompt-status-content-if-needed! [content]
  (when-not (= *last-prompt-status-content* content)
    (set! *last-prompt-status-content* content)
    (console/set-prompt-status-content! content)))

(defn set-prompt-status-style-if-needed! [style]
  (when-not (= *last-prompt-status-style* style)
    (set! *last-prompt-status-style* style)
    (console/set-prompt-status-style! style)))

(defn update-repl-mode! []
  (if (repl-ready?)
    (set-prompt-mode-if-needed! :edit)
    (set-prompt-mode-if-needed! :status))
  (set-prompt-status-banner-if-needed! *last-prompt-status-banner*)
  (set-prompt-status-content-if-needed! *last-prompt-status-content*)
  (set-prompt-status-style-if-needed! *last-prompt-status-style*))

(defn display-prompt-status [status & [style]]
  (let [effective-style (or style :error)]
    (set-prompt-mode-if-needed! :status)
    (set-prompt-status-banner-if-needed! "")
    (set-prompt-status-content-if-needed! status)
    (set-prompt-status-style-if-needed! effective-style)))

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
    (if-let [client-config (<! (eval/get-dirac-client-config))]
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
        (set-prompt-status-banner-if-needed! (will-reconnect-banner-msg remaining-time))
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
    (if-let [client-config (<! (eval/get-dirac-client-config))]
      (do
        (info "Starting REPL support. Dirac client-side config is " client-config)
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
      (if (<! (eval/is-devtools-present?))
        (let [api-version (<! (eval/get-dirac-api-version))]
          (if-not (< api-version required-dirac-api-version)
            (start-repl!)
            (display-prompt-status (old-cljs-devtools-msg api-version required-dirac-api-version))))
        (display-prompt-status (eval/missing-cljs-devtools-message))))))

; -- message processing -----------------------------------------------------------------------------------------------------

; When we connect to freshly open nREPL session, cljs REPL is not boostrapped (google "nREPL piggieback" for more details).
(defmethod nrepl-tunnel-client/process-message :bootstrap [_client message]
  (check-version! (:version message))
  (go
    (let [response (<! (nrepl-tunnel-client/tunnel-message-with-response! (nrepl-tunnel-client/boostrap-cljs-repl-message)))]
      (case (first (:status response))
        "done" (do
                 (set! *repl-bootstrapped* true)
                 (update-repl-mode!)
                 {:op :bootstrap-done})
        "timeout" (do
                    (display-prompt-status (unable-to-bootstrap-msg))
                    {:op :bootstrap-timeout})
        (do
          (display-prompt-status (bootstrap-error-msg))
          {:op :bootstrap-error})))))

(defmethod nrepl-tunnel-client/process-message :bootstrap-info [_client message]
  (let [{:keys [server-url ns]} message]
    (assert server-url (str "expected :server-url in :bootstrap-info message" message))
    (assert ns (str "expected :ns in :bootstrap-info message" message))
    (console/set-prompt-ns! ns)
    (connect-to-weasel-server! server-url))
  nil)