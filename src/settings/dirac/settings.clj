(ns dirac.settings
  (:require [environ.core :refer [env]]))

; we want this stuff to be accessible both from clojure and clojurescript

; -- time -------------------------------------------------------------------------------------------------------------------

(def ^:const SECOND 1000)
(def ^:const MINUTE (* 60 SECOND))

(defmacro seconds [v]
  (* SECOND v))

(defmacro minutes [v]
  (* MINUTE v))

(defmacro ms [v]
  v)

; ---------------------------------------------------------------------------------------------------------------------------

(def ^:const BACKEND_TESTS_NREPL_SERVER_TIMEOUT (seconds 60))
(def ^:const BACKEND_TESTS_NREPL_SERVER_HOST "localhost")
(def ^:const BACKEND_TESTS_NREPL_SERVER_PORT 7230)                                                                            ; -1000 from defaults
(def ^:const BACKEND_TESTS_NREPL_TUNNEL_HOST "localhost")
(def ^:const BACKEND_TESTS_NREPL_TUNNEL_PORT 7231)                                                                            ; -1000 from defaults
(def ^:const BACKEND_TESTS_WEASEL_HOST "localhost")
(def ^:const BACKEND_TESTS_WEASEL_PORT 7232)                                                                                  ; -1000 from defaults

(def ^:const DIRAC_AGENT_BOOT_TIME (seconds 2))
(def ^:const TRANSCRIPT_MATCH_TIMEOUT (minutes 2))
(def ^:const LAUNCH_TASK_KEY "diracLaunchTask")
(def ^:const LAUNCH_TASK_MESSAGE "dirac-launch-task")
(def ^:const KILL_TASK_KEY "diracKillTask")
(def ^:const KILL_TASK_MESSAGE "dirac-kill-task")

(def ^:const MARION_STABLE_CONNECTION_TIMEOUT (seconds 2))
(def ^:const MARION_RECONNECTION_ATTEMPT_DELAY (seconds 2))
(def ^:const MARION_MESSAGE_REPLY_TIMEOUT (minutes 1))
(def ^:const MARION_OPEN_SCENARIO_TIMEOUT (minutes 1))                                                                        ; cold start could be quite slow in a docker container on cloud VPS

(def ^:const DEFAULT_TASK_TIMEOUT (minutes 5))
(def ^:const KILL_TASK_TIMEOUT (seconds 5))
(def ^:const DEFAULT_TEST_HTML_LOAD_TIMEOUT (seconds 30))
(def ^:const SIGNAL_SERVER_CLOSE_WAIT_TIMEOUT (ms 500))
(def ^:const PENDING_REPLIES_WAIT_TIMEOUT (seconds 2))
(def ^:const SIGNAL_CLIENT_TASK_RESULT_DELAY (ms 0))
(def ^:const SIGNAL_CLIENT_CLOSE_DELAY (ms 0))
(def ^:const SIGNAL_SERVER_MAX_CONNECTION_TIME (seconds 5))
(def ^:const TASK_DISCONNECTED_WAIT_TIMEOUT (seconds 2))

(def ^:const ACTUAL_TRANSCRIPTS_ROOT_PATH "test/browser/transcripts/_actual_/")
(def ^:const EXPECTED_TRANSCRIPTS_ROOT_PATH "test/browser/transcripts/expected/")

(def ^:const TRANSCRIPT_LABEL_PADDING_LENGTH 17)
(def ^:const TRANSCRIPT_LABEL_PADDING_TYPE :right)

(def ^:const SCRIPT_RUNNER_LAUNCH_DELAY (seconds 2))

(def ^:const FIXTURES_SERVER_HOST "localhost")
(def ^:const FIXTURES_SERVER_PORT 9090)

(def ^:const SIGNAL_SERVER_HOST "localhost")
(def ^:const SIGNAL_SERVER_PORT 22555)

(def ^:const TRANSCRIPT_STREAMER_SERVER_HOST "localhost")
(def ^:const TRANSCRIPT_STREAMER_SERVER_PORT 22556)
(def ^:const TRANSCRIPT_MAX_CHROME_LOG_LINES 3000)

(def ^:const AUTOMATION_ENTRY_POINT_KEY "diracAutomateDevTools")
(def ^:const FLUSH_PENDING_FEEDBACK_MESSAGES_KEY "diracFlushPendingFeedbackMessages")
(def ^:const DIRAC_INTERCOM_KEY "diracIntercom")

; page load timeout could be extremely slow under docker https://bugs.chromium.org/p/chromedriver/issues/detail?id=817#c56
(def ^:const TAXI_PAGE_LOAD_TIMEOUT (minutes 3))
(def ^:const TAXI_SCRIPT_TIMEOUT (seconds 30))
(def ^:const TAXI_IMPLICIT_WAIT (seconds 30))

(def ^:const BACKEND_URL_RESOLUTION_TRIALS 5)
(def ^:const FAILED_BACKEND_URL_RESOLUTION_DELAY (seconds 1))

(def ^:const FRONTEND_HANDSHAKE_TIMEOUT (seconds 3))
(def ^:const FRONTEND_LOADING_TIMEOUT (seconds 5))
(def ^:const INTERCOM_INIT_TIMEOUT (seconds 3))

(def dirac-devtools-window-top (env :dirac-setup-devtools-window-top))
(def dirac-devtools-window-left (env :dirac-setup-devtools-window-left))
(def dirac-devtools-window-width (env :dirac-setup-devtools-window-width))
(def dirac-devtools-window-height (env :dirac-setup-devtools-window-height))

(def dirac-runner-window-top (env :dirac-setup-runner-window-top))
(def dirac-runner-window-left (env :dirac-setup-runner-window-left))
(def dirac-runner-window-width (env :dirac-setup-runner-window-width))
(def dirac-runner-window-height (env :dirac-setup-runner-window-height))

(def dirac-scenario-window-top (env :dirac-setup-scenario-window-top))
(def dirac-scenario-window-left (env :dirac-setup-scenario-window-left))
(def dirac-scenario-window-width (env :dirac-setup-scenario-window-width))
(def dirac-scenario-window-height (env :dirac-setup-scenario-window-height))

(def chrome-remote-debugging-port (env :dirac-setup-chrome-remote-debugging-port))
(def chrome-remote-debugging-host (env :dirac-setup-chrome-remote-debugging-host))

; -- macro wrappers ---------------------------------------------------------------------------------------------------------
; macros allow us to potentially expose the constants to cljs

(defmacro get-backend-tests-nrepl-server-timeout []
  BACKEND_TESTS_NREPL_SERVER_TIMEOUT)

(defmacro get-backend-tests-nrepl-server-host []
  BACKEND_TESTS_NREPL_SERVER_HOST)

(defmacro get-backend-tests-nrepl-server-port []
  BACKEND_TESTS_NREPL_SERVER_PORT)

(defmacro get-backend-tests-nrepl-server-url []
  (let [port (get-backend-tests-nrepl-server-port)]
    (str "nrepl://" (get-backend-tests-nrepl-server-host) (if (some? port) (str ":" port)))))

(defmacro get-backend-tests-nrepl-tunnel-port []
  BACKEND_TESTS_NREPL_TUNNEL_PORT)

(defmacro get-backend-tests-nrepl-tunnel-host []
  BACKEND_TESTS_NREPL_TUNNEL_HOST)

(defmacro get-backend-tests-nrepl-tunnel-url []
  (let [port (get-backend-tests-nrepl-tunnel-port)]
    (str "ws://" (get-backend-tests-nrepl-tunnel-host) (if (some? port) (str ":" port)))))

(defmacro get-backend-tests-weasel-host []
  BACKEND_TESTS_WEASEL_HOST)

(defmacro get-backend-tests-weasel-port []
  BACKEND_TESTS_WEASEL_PORT)

(defmacro get-dirac-agent-boot-time []
  DIRAC_AGENT_BOOT_TIME)

(defmacro get-launch-task-key []
  LAUNCH_TASK_KEY)

(defmacro get-launch-task-message []
  LAUNCH_TASK_MESSAGE)

(defmacro get-kill-task-key []
  KILL_TASK_KEY)

(defmacro get-kill-task-message []
  KILL_TASK_MESSAGE)

(defmacro get-transcript-match-timeout []
  TRANSCRIPT_MATCH_TIMEOUT)

(defmacro get-marion-stable-connection-timeout []
  MARION_STABLE_CONNECTION_TIMEOUT)

(defmacro get-marion-reconnection-attempt-delay []
  MARION_RECONNECTION_ATTEMPT_DELAY)

(defmacro get-marion-message-reply-timeout []
  MARION_MESSAGE_REPLY_TIMEOUT)

(defmacro get-marion-open-scenario-timeout []
  MARION_OPEN_SCENARIO_TIMEOUT)

(defmacro get-default-task-timeout []
  DEFAULT_TASK_TIMEOUT)

(defmacro get-kill-task-timeout []
  KILL_TASK_TIMEOUT)

(defmacro get-default-test-html-load-timeout []
  DEFAULT_TEST_HTML_LOAD_TIMEOUT)

(defmacro get-signal-server-close-wait-timeout []
  SIGNAL_SERVER_CLOSE_WAIT_TIMEOUT)

(defmacro get-actual-transcripts-root-path []
  ACTUAL_TRANSCRIPTS_ROOT_PATH)

(defmacro get-expected-transcripts-root-path []
  EXPECTED_TRANSCRIPTS_ROOT_PATH)

(defmacro get-dirac-devtools-window-top []
  dirac-devtools-window-top)

(defmacro get-dirac-devtools-window-left []
  dirac-devtools-window-left)

(defmacro get-dirac-devtools-window-width []
  dirac-devtools-window-width)

(defmacro get-dirac-devtools-window-height []
  dirac-devtools-window-height)

(defmacro get-dirac-runner-window-top []
  dirac-runner-window-top)

(defmacro get-dirac-runner-window-left []
  dirac-runner-window-left)

(defmacro get-dirac-runner-window-width []
  dirac-runner-window-width)

(defmacro get-dirac-runner-window-height []
  dirac-runner-window-height)

(defmacro get-dirac-scenario-window-top []
  dirac-scenario-window-top)

(defmacro get-dirac-scenario-window-left []
  dirac-scenario-window-left)

(defmacro get-dirac-scenario-window-width []
  dirac-scenario-window-width)

(defmacro get-dirac-scenario-window-height []
  dirac-scenario-window-height)

(defmacro get-transcript-label-padding-length []
  TRANSCRIPT_LABEL_PADDING_LENGTH)

(defmacro get-transcript-label-padding-type []
  TRANSCRIPT_LABEL_PADDING_TYPE)

(defmacro get-script-runner-launch-delay []
  SCRIPT_RUNNER_LAUNCH_DELAY)

(defmacro get-fixtures-server-host []
  FIXTURES_SERVER_HOST)

(defmacro get-fixtures-server-port []
  FIXTURES_SERVER_PORT)

(defmacro get-fixtures-server-url []
  (let [port (get-fixtures-server-port)]
    (str "http://" (get-fixtures-server-host) (if (some? port) (str ":" port)))))

(defmacro get-signal-server-host []
  SIGNAL_SERVER_HOST)

(defmacro get-signal-server-port []
  SIGNAL_SERVER_PORT)

(defmacro get-signal-server-url []
  (let [port (get-signal-server-port)]
    (str "ws://" (get-signal-server-host) (if (some? port) (str ":" port)))))

(defmacro get-chrome-remote-debugging-port []
  (if (some? chrome-remote-debugging-port)
    (Integer/parseInt chrome-remote-debugging-port)))

(defmacro get-chrome-remote-debugging-host []
  chrome-remote-debugging-host)

(defmacro get-pending-replies-wait-timeout []
  PENDING_REPLIES_WAIT_TIMEOUT)

(defmacro get-signal-client-task-result-delay []
  SIGNAL_CLIENT_TASK_RESULT_DELAY)

(defmacro get-signal-client-close-delay []
  SIGNAL_CLIENT_CLOSE_DELAY)

(defmacro get-signal-server-max-connection-time []
  SIGNAL_SERVER_MAX_CONNECTION_TIME)

(defmacro get-automation-entry-point-key []
  AUTOMATION_ENTRY_POINT_KEY)

(defmacro get-flush-pending-feedback-messages-key []
  FLUSH_PENDING_FEEDBACK_MESSAGES_KEY)

(defmacro get-dirac-intercom-key []
  DIRAC_INTERCOM_KEY)

(defmacro get-task-disconnected-wait-timeout []
  TASK_DISCONNECTED_WAIT_TIMEOUT)

(defmacro get-taxi-page-load-timeout []
  TAXI_PAGE_LOAD_TIMEOUT)

(defmacro get-taxi-script-timeout []
  TAXI_SCRIPT_TIMEOUT)

(defmacro get-taxi-implicit-wait []
  TAXI_IMPLICIT_WAIT)

(defmacro get-backend-url-resolution-trials []
  BACKEND_URL_RESOLUTION_TRIALS)

(defmacro get-failed-backend-url-resolution-delay []
  FAILED_BACKEND_URL_RESOLUTION_DELAY)

(defmacro get-transcript-streamer-server-host []
  TRANSCRIPT_STREAMER_SERVER_HOST)

(defmacro get-transcript-streamer-server-port []
  TRANSCRIPT_STREAMER_SERVER_PORT)

(defmacro get-transcript-max-chrome-log-lines []
  TRANSCRIPT_MAX_CHROME_LOG_LINES)

(defmacro get-transcript-streamer-server-url []
  (let [port (get-transcript-streamer-server-port)]
    (str "ws://" (get-transcript-streamer-server-host) (if (some? port) (str ":" port)))))

(defmacro get-frontend-handshake-timeout []
  FRONTEND_HANDSHAKE_TIMEOUT)

(defmacro get-frontend-loading-timeout []
  FRONTEND_LOADING_TIMEOUT)

(defmacro get-intercom-init-timeout []
  INTERCOM_INIT_TIMEOUT)
