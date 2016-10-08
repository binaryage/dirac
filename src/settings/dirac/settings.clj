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

(defmacro milisec [v]
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
(def ^:const TRANSCRIPT_MATCH_TIMEOUT (seconds 5))
(def ^:const LAUNCH_TASK_KEY "diracLaunchTask")
(def ^:const LAUNCH_TASK_MESSAGE "dirac-launch-task")

(def ^:const MARION_INITIAL_WAIT_TIME (seconds 1))
(def ^:const MARION_RECONNECTION_ATTEMPT_DELAY (seconds 2))
(def ^:const MARION_MESSAGE_REPLY_TIMEOUT (seconds 10))

(def ^:const DEFAULT_TASK_TIMEOUT (minutes 5))
(def ^:const DEFAULT_TEST_HTML_LOAD_TIMEOUT (seconds 5))
(def ^:const SIGNAL_SERVER_CLOSE_WAIT_TIMEOUT (milisec 500))
(def ^:const PENDING_REPLIES_WAIT_TIMEOUT (seconds 2))
(def ^:const SIGNAL_CLIENT_TASK_RESULT_DELAY (milisec 0))
(def ^:const SIGNAL_CLIENT_CLOSE_DELAY (milisec 0))
(def ^:const SIGNAL_SERVER_MAX_CONNECTION_TIME (seconds 5))
(def ^:const TASK_DISCONNECTED_WAIT_TIMEOUT (seconds 2))

(def ^:const ACTUAL_TRANSCRIPTS_ROOT_PATH "test/browser/transcripts/actual/")
(def ^:const EXPECTED_TRANSCRIPTS_ROOT_PATH "test/browser/transcripts/expected/")

(def ^:const TRANSCRIPT_LABEL_PADDING_LENGTH 17)
(def ^:const TRANSCRIPT_LABEL_PADDING_TYPE :right)

(def ^:const BROWSER_CONNECTION_MINIMAL_COOLDOWN (seconds 4))
(def ^:const SCRIPT_RUNNER_LAUNCH_DELAY (seconds 2))

(def ^:const FIXTURES_SERVER_HOST "localhost")
(def ^:const FIXTURES_SERVER_PORT 9090)

(def ^:const SIGNAL_SERVER_HOST "localhost")
(def ^:const SIGNAL_SERVER_PORT 22555)

(def ^:const AUTOMATION_ENTRY_POINT_KEY "diracAutomateDevTools")
(def ^:const FLUSH_PENDING_FEEDBACK_MESSAGES_KEY "diracFlushPendingFeedbackMessages")
(def ^:const DIRAC_INTERCOM_KEY "diracIntercom")

(def dirac-devtools-window-top (env :dirac-devtools-window-top))
(def dirac-devtools-window-left (env :dirac-devtools-window-left))
(def dirac-devtools-window-width (env :dirac-devtools-window-width))
(def dirac-devtools-window-height (env :dirac-devtools-window-height))

(def dirac-runner-window-top (env :dirac-runner-window-top))
(def dirac-runner-window-left (env :dirac-runner-window-left))
(def dirac-runner-window-width (env :dirac-runner-window-width))
(def dirac-runner-window-height (env :dirac-runner-window-height))

(def dirac-scenario-window-top (env :dirac-scenario-window-top))
(def dirac-scenario-window-left (env :dirac-scenario-window-left))
(def dirac-scenario-window-width (env :dirac-scenario-window-width))
(def dirac-scenario-window-height (env :dirac-scenario-window-height))

(def chrome-remote-debugging-port (env :dirac-chrome-remote-debugging-port))
(def chrome-remote-debugging-host (env :dirac-chrome-remote-debugging-host))

; -- macro wrappers ---------------------------------------------------------------------------------------------------------
; macros allow us to potentially expose the constants to cljs

(defmacro get-backend-tests-nrepl-server-timeout []
  BACKEND_TESTS_NREPL_SERVER_TIMEOUT)

(defmacro get-backend-tests-nrepl-server-host []
  BACKEND_TESTS_NREPL_SERVER_HOST)

(defmacro get-backend-tests-nrepl-server-port []
  BACKEND_TESTS_NREPL_SERVER_PORT)

(defmacro get-backend-tests-nrepl-server-url []
  (str "nrepl://" (get-backend-tests-nrepl-server-host) ":" (get-backend-tests-nrepl-server-port)))

(defmacro get-backend-tests-nrepl-tunnel-port []
  BACKEND_TESTS_NREPL_TUNNEL_PORT)

(defmacro get-backend-tests-nrepl-tunnel-host []
  BACKEND_TESTS_NREPL_TUNNEL_HOST)

(defmacro get-backend-tests-nrepl-tunnel-url []
  (str "ws://" (get-backend-tests-nrepl-tunnel-host) ":" (get-backend-tests-nrepl-tunnel-port)))

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

(defmacro get-transcript-match-timeout []
  TRANSCRIPT_MATCH_TIMEOUT)

(defmacro get-marion-initial-wait-time []
  MARION_INITIAL_WAIT_TIME)

(defmacro get-marion-reconnection-attempt-delay []
  MARION_RECONNECTION_ATTEMPT_DELAY)

(defmacro get-marion-message-reply-timeout []
  MARION_MESSAGE_REPLY_TIMEOUT)

(defmacro get-default-task-timeout []
  DEFAULT_TASK_TIMEOUT)

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

(defmacro get-browser-connection-minimal-cooldown []
  BROWSER_CONNECTION_MINIMAL_COOLDOWN)

(defmacro get-script-runner-launch-delay []
  SCRIPT_RUNNER_LAUNCH_DELAY)

(defmacro get-fixtures-server-host []
  FIXTURES_SERVER_HOST)

(defmacro get-fixtures-server-port []
  FIXTURES_SERVER_PORT)

(defmacro get-fixtures-server-url []
  (str "http://" (get-fixtures-server-host) ":" (get-fixtures-server-port)))

(defmacro get-signal-server-host []
  SIGNAL_SERVER_HOST)

(defmacro get-signal-server-port []
  SIGNAL_SERVER_PORT)

(defmacro get-signal-server-url []
  (str "ws://" (get-signal-server-host) ":" (get-signal-server-port)))

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
