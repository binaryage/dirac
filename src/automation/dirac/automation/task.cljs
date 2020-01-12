(ns dirac.automation.task
  (:require [dirac.automation.feedback :as feedback]
            [dirac.automation.helpers :as helpers]
            [dirac.automation.launcher :as launcher]
            [dirac.automation.logging :refer [error info log warn]]
            [dirac.automation.messages :as messages]
            [dirac.automation.runner :as runner]
            [dirac.automation.status-host :as status-host]
            [dirac.automation.transcript-host :as transcript-host]
            [dirac.shared.ws-client :as ws-client]
            [dirac.options.model :as options-model]
            [dirac.settings :refer [get-chrome-remote-debugging-host
                                    get-chrome-remote-debugging-port
                                    get-pending-replies-wait-timeout
                                    get-signal-client-close-delay
                                    get-signal-client-task-result-delay
                                    get-signal-server-url
                                    get-transcript-streamer-server-url]]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]
            [dirac.shared.utils :as utils]
            [oops.core :refer [gapply!+ gcall! gset! oapply ocall oget oset!]]))

(declare register-global-error-handler!)

(defonce setup-done (volatile! false))
(defonce exit-code (volatile! nil))
(defonce failed-state? (volatile! false))

; -- cljs printing ----------------------------------------------------------------------------------------------------------

(defn init-cljs-printing! []
  (set! *print-newline* false)
  (set! *print-fn* (fn [& args]
                     (gapply!+ "console.log" (into-array args))
                     (transcript-host/append-to-transcript! "stdout" (apply str args))))
  (set! *print-err-fn* (fn [& args]
                         (gapply!+ "console.error" (into-array args))
                         (transcript-host/append-to-transcript! "stderr" (apply str args))))
  nil)

; -- chrome driver support --------------------------------------------------------------------------------------------------

(defn go-setup-debugging-port! []
  (go
    (let [debugging-host (or (helpers/get-document-url-param "debugging_host")
                             (get-chrome-remote-debugging-host)
                             "http://localhost")
          debugging-port (or (helpers/get-document-url-param "debugging_port")
                             (get-chrome-remote-debugging-port)
                             "9222")
          target-url (str debugging-host ":" debugging-port)]
      (when-not (= target-url (:target-url options-model/default-options))
        (info (str "Setting Dirac Extension :target-url option to " target-url))
        (<! (messages/go-set-options! {:target-url target-url}))))))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn go-reset-browser-state! []
  (go
    ; to fight https://bugs.chromium.org/p/chromium/issues/detail?id=355075
    (<! (messages/go-post-message! #js {:type "marion-close-all-tabs"}))
    (<! (messages/go-post-extension-command! {:command :tear-down}))))

(defn go-show-task-runner! []
  (go
    (<! (messages/go-switch-to-runner-tab!))
    (<! (messages/go-focus-runner-window!))))

; this signals to the task runner that he can reconnect chrome driver and check the results
(defn send-finished-task-signal! [success?]
  (let [client-config {:name    "Signaller"
                       :on-open (fn [client]
                                  (go
                                    (<! (go-wait (get-signal-client-task-result-delay)))
                                    (ws-client/send! client {:op      :task-result
                                                             :success success?})
                                    (<! (go-wait (get-signal-client-close-delay)))
                                    (ws-client/close! client)))}]
    (ws-client/connect! (get-signal-server-url) client-config)))

; -- task state -------------------------------------------------------------------------------------------------------------

(defn success? []
  (= @exit-code ::success))

(defn failed? []
  @failed-state?)

(defn running? []
  (nil? @exit-code))

(defn pause-if-not-under-test-runner! []
  (when-not (helpers/automated-testing?)
    (runner/pause)))

(defn set-exit-code! [code]
  (log "set-exit-code!" code)
  (vreset! exit-code code))

(defn normalized? []
  (if-not (helpers/automated-testing?)
    (runner/normalized?)
    true))

(defn get-transcript-streamer-server-url-if-needed []
  (when (helpers/automated-testing?)
    (get-transcript-streamer-server-url)))

(defn make-failure-matcher []
  (fn [[label _message]]
    (when-not (failed?)
      (when (or (= label "fail")
                (= label "error"))
        (log "FAILURE detected")
        (vreset! failed-state? true)
        (pause-if-not-under-test-runner!)))
    false))

; -- task life-cycle --------------------------------------------------------------------------------------------------------

(defn go-setup-task! [& [config]]
  (go
    (when-not @setup-done                                                                                                     ; this is here to support figwheel's hot-reloading
      (vreset! setup-done true)
      (messages/init! "task-runner")
      ; transcript is a fancy name for "log of interesting events"
      (register-global-error-handler!)
      (transcript-host/init-transcript! "transcript-box" (normalized?) (get-transcript-streamer-server-url-if-needed))
      ; when we are not running under test-runner, we want skip all future actions after a failure
      ; this helps inspection of the problems in an interactive way
      (transcript-host/register-observer! (make-failure-matcher))
      (status-host/init-status! "status-box")
      (init-cljs-printing!)
      (launcher/init!)
      ; feedback subsystem is responsible for intercepting messages to be presented in transcript
      (feedback/init!)
      (<! (messages/go-reposition-runner-window!))
      ; if test runner is present, we will wait for test runner to launch the test
      ; it needs to disconnect the driver first
      (when-not (helpers/automated-testing?)
        (launcher/launch-task!)))))

(defn go-teardown-task! []
  (assert (not (running?)))
  (let [runner-present? (helpers/automated-testing?)
        successful? (success?)]
    (go
      ; this prevents any new transcript being spit out during our teardown process, except for forced appends
      (transcript-host/disable-transcript!)
      ; under manual test development we don't want to reset-browser-state!
      ; - closing existing tabs would interfere with our ability to inspect broken test results
      ; also we don't want to signal "task finished" because  there is no test runner listening
      (if-not runner-present?
        (<! (go-show-task-runner!))                                                                                           ; this is for convenience
        (when successful?
          ; we want to close all tabs/windows opened (owned) by our extension
          ; chrome driver does not have access to those windows and fails to switch back to its own tab
          ; https://bugs.chromium.org/p/chromium/issues/detail?id=355075
          (<! (go-reset-browser-state!))))
      (<! (messages/go-wait-for-all-pending-replies-or-timeout! (get-pending-replies-wait-timeout)))
      (feedback/done!)
      (when runner-present?
        (send-finished-task-signal! successful?))                                                                             ; note: if task runner wasn't successful we leave browser in failed state for possible inspection
      successful?)))

; -- task termination cases -------------------------------------------------------------------------------------------------

(defn report-fail-case! []
  (set-exit-code! ::failed)
  (status-host/set-status! "task failed (all actions after the failure were ignored)")
  (status-host/set-style! "failed")
  (transcript-host/set-style! "failed"))

(defn report-success-case! []
  (set-exit-code! ::success)
  (status-host/set-status! "task finished")
  (status-host/set-style! "finished")
  (transcript-host/set-style! "finished"))

(defn report-kill-case! []
  (set-exit-code! ::killed)
  (transcript-host/forced-append-to-transcript! "killed" "the task was killed externally")
  (status-host/set-status! "task killed!")
  (status-host/set-style! "killed")
  (transcript-host/set-style! "killed"))

(defn report-timeout-case! [options]
  (set-exit-code! ::timeout)
  (transcript-host/forced-append-to-transcript! "timeout" (:transcript options))
  (status-host/set-status! (or (:status options) "task timeouted!"))
  (status-host/set-style! (or (:style options) "timeout"))
  (transcript-host/set-style! (or (:style options) "timeout")))

(defn report-exception-case! [options]
  (set-exit-code! ::exception)
  (status-host/set-status! (str "task has thrown an exception: " (:message options)))
  (status-host/set-style! "exception")
  (transcript-host/forced-append-to-transcript! "exception" (utils/format-error (:exception options)))
  (transcript-host/set-style! "exception"))

; -- task wrapping ----------------------------------------------------------------------------------------------------------

(defn go-start-task! []
  (go
    (status-host/set-status! "task running...")
    (status-host/set-style! "running")
    (transcript-host/set-style! "running")
    ; this will ensure we get stable devtools/scenario ids with each new run => stable transcript output
    ; this will also reset extension options to defaults!
    (<! (messages/go-reset-state!))
    ; when launched from test runner, chrome driver is in charge of selecting debugging port, we have to propagate this
    ; information to our dirac extension settings
    (<! (go-setup-debugging-port!))
    ; open-as window is handy for debugging, because we can open internal devtools to inspect dirac frontend in case of errors
    (<! (messages/go-set-options! {:open-as "window"}))))

(defn go-finish-task! []
  (go
    (when (running?)
      (if (failed?)
        (report-fail-case!)
        (report-success-case!))
      (<! (go-teardown-task!)))))

(defn go-kill-task! []
  (go
    (when (running?)
      report-kill-case!
      (<! (go-teardown-task!)))))

(defn go-handle-task-timeout! [data]
  (go
    (when (running?)
      (report-timeout-case! data)
      (<! (go-teardown-task!)))))

(defn go-handle-task-exception! [message e]
  (go
    (when (running?)
      (report-exception-case! {:message   message
                               :exception e})
      (<! (go-teardown-task!)))))

; -- handling global errors -------------------------------------------------------------------------------------------------

(defn go-handle-task-error! [message _source _lineno _colno e]
  (case (ex-message e)
    :task-timeout (go-handle-task-timeout! (ex-data e))
    :serialized-error (go-handle-task-exception! (second (ex-data e)) (nth (ex-data e) 2 "<missing stack trace>"))
    (go-handle-task-exception! message e)))

(defn register-global-error-handler! []
  (let [global-error-handler (fn [& args]
                               (apply go-handle-task-error! args)
                               ; do not prevent firing default handler
                               false)]
    (gset! "onerror" global-error-handler)))
