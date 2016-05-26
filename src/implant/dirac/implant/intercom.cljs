(ns dirac.implant.intercom
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.implant.intercom :refer [error-response]])
  (:require [cljs.core.async :refer [<! chan put! timeout close!]]
            [cljs.tools.reader.edn :as reader-edn]
            [cljs.tools.reader.reader-types :as reader-types]
            [clojure.walk :as walk]
            [dirac.implant.console :as console]
            [dirac.implant.weasel-client :as weasel-client]
            [dirac.implant.nrepl-tunnel-client :as nrepl-tunnel-client]
            [dirac.implant.version :as implant-version]
            [dirac.utils :as utils]
            [chromex.logging :refer-macros [log info warn error]]
            [dirac.implant.eval :as eval]
            [devtools.toolbox :refer [envelope]]
            [clojure.string :as string])
  (:import goog.net.WebSocket.ErrorEvent))

(defonce required-repl-api-version 3)

(defonce ^:dynamic *repl-connected* false)
(defonce ^:dynamic *repl-bootstrapped* false)
(defonce ^:dynamic *last-connection-url* nil)
(defonce ^:dynamic *last-connect-fn-id* 0)

(def dirac-agent-help-url "https://github.com/binaryage/dirac/blob/master/docs/installation.md#start-dirac-agent")

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

(defn ^:dynamic unrecognized-forwarded-nrepl-op-msg [op forwarded-nrepl-message]
  (str "Received unrecognized operation [op='" op "'] in forwarded nREPL message:\n"
       forwarded-nrepl-message))

(defn ^:dynamic unable-unserialize-msg [forwarded-nrepl-message serialized-forwarded-nrepl-message]
  (str "Unable to unserialize forwarded nREPL message:\n"
       forwarded-nrepl-message "\n"
       "nREPL message: <" serialized-forwarded-nrepl-message ">"))

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
    (if-let [runtime-config (<! (eval/get-runtime-config))]
      (do
        (let [runtime-tag (<! (eval/get-runtime-tag))
              weasel-options (utils/remove-nil-values {:verbose?        (:weasel-verbose runtime-config)
                                                       :auto-reconnect? (:weasel-auto-reconnect runtime-config)
                                                       :pre-eval-delay  (:weasel-pre-eval-delay runtime-config)
                                                       :ready-msg       {:ident runtime-tag}})]
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

(defn prepare-scope-info [scope-info-js]
  (js->clj scope-info-js :keywordize-keys true))

(defn send-eval-request! [job-id code scope-info]
  (when (repl-ready?)
    (console/announce-job-start! job-id (str "eval: " code))
    (let [message {:op         "eval"
                   :dirac      "wrap"
                   :id         job-id
                   :code       code
                   :scope-info (prepare-scope-info scope-info)}]
      (nrepl-tunnel-client/tunnel-message! (utils/compact message)))))

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

; ---------------------------------------------------------------------------------------------------------------------------
; -- message processing -----------------------------------------------------------------------------------------------------

; -- :bootstrap -------------------------------------------------------------------------------------------------------------

; When we connect to a freshly open nREPL session, CLJS REPL is not boostrapped yet.
; Normally user enters something like "(cemerick.piggieback/cljs-repl ...)" into his nREPL Clojure session to enter CLJS REPL.
; Because we have control over nREPL process thanks to our middleware, we can automate this process.
; We send a bootstrap message with request to enter CLJS REPL on user's behalf (google "nREPL piggieback" for more details).

(defn make-boostrap-message [runtime-config runtime-tag]
  (let [nrepl-config (-> (:nrepl-config runtime-config)
                         (assoc :runtime-tag runtime-tag))]
    {:op   "eval"
     :code (pr-str `(do
                      (~'require '~'dirac.nrepl)
                      (dirac.nrepl/boot-dirac-repl! ~nrepl-config)))}))

(defmethod nrepl-tunnel-client/process-message :bootstrap [_client message]
  (check-version! (:version message))
  (go
    (let [runtime-tag (<! (eval/get-runtime-tag))
          runtime-config (<! (eval/get-runtime-config))
          bootstrap-message (make-boostrap-message runtime-config runtime-tag)
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

; -- :bootstrap-info --------------------------------------------------------------------------------------------------------

(defmethod nrepl-tunnel-client/process-message :bootstrap-info [_client message]
  (let [{:keys [weasel-url ns]} message]
    (assert weasel-url (str "expected :weasel-url in :bootstrap-info message" message))
    (assert ns (str "expected :ns in :bootstrap-info message" message))
    (console/set-prompt-ns! ns)
    (connect-to-weasel-server! weasel-url))
  nil)

; -- :handle-forwarded-nrepl-message ----------------------------------------------------------------------------------------------

(defn bounce-message! [message job-id]
  (nrepl-tunnel-client/tunnel-message! (assoc message :id job-id)))

(defn unserialize-nrepl-message [serialized-message]
  (try
    ; if serialized message contains some unknown reader tags we can recover by replacing them with marker and then nil
    (let [reader (reader-types/indexing-push-back-reader serialized-message)                                                  ; indexing reader will provide line/column info in case of errors
          marker ::skipped-tagged-value
          opts {:default (constantly marker)}]                                                                                ; parse all unknown tags as ::skipped-tagged-value
      (walk/postwalk-replace {marker nil} (reader-edn/read opts reader)))                                                     ; we cannot use nil marker due to reader special case for nils returned from :default fn
    (catch :default e
      e)))

(defn handle-forwarded-eval-message! [forwarded-message job-id]
  (log "handle-forwarded-eval-message!" job-id forwarded-message)
  (if-let [code (:code forwarded-message)]
    (console/append-dirac-command! code job-id)
    (error-response job-id "Key :code is missing in forwarded eval message:\n"
                    forwarded-message)))

(defn handle-forwarded-load-file-message! [forwarded-message job-id]
  (log "handle-forwarded-load-file-message!" job-id forwarded-message)
  (let [file-path (:file-path forwarded-message)]
    (eval/console-info! "Loading" (or file-path "?") "...")
    (bounce-message! forwarded-message job-id)))

(defn handle-forwarded-interrupt-message! [forwarded-message job-id]
  (log "handle-forwarded-interrupt-message!" job-id forwarded-message)
  (let [interrupt-id (:interrupt-id forwarded-message)]
    (eval/console-info! "Interrupt request for job" interrupt-id)
    (bounce-message! forwarded-message job-id)))

(defmethod nrepl-tunnel-client/process-message :handle-forwarded-nrepl-message [_client message]
  (let [{:keys [job-id serialized-forwarded-nrepl-message]} message]
    (assert (some? job-id) "expected :job-id in :handle-forwarded-nrepl-message")
    (assert (string? serialized-forwarded-nrepl-message)
            (str "expected string :serialized-forwarded-nrepl-message in :handle-forwarded-nrepl-message" message))
    (let [forwarded-nrepl-message (unserialize-nrepl-message serialized-forwarded-nrepl-message)]
      (if (and (some? forwarded-nrepl-message) (not (instance? js/Error forwarded-nrepl-message)))
        (let [op (:op forwarded-nrepl-message)]
          (case op
            "eval" (handle-forwarded-eval-message! forwarded-nrepl-message job-id)
            "load-file" (handle-forwarded-load-file-message! forwarded-nrepl-message job-id)
            "interrupt" (handle-forwarded-interrupt-message! forwarded-nrepl-message job-id)
            (error-response job-id (unrecognized-forwarded-nrepl-op-msg op forwarded-nrepl-message))))
        (error-response job-id (unable-unserialize-msg forwarded-nrepl-message serialized-forwarded-nrepl-message))))))