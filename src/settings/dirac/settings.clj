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

; ---------------------------------------------------------------------------------------------------------------------------

(def ^:const BACKEND_TESTS_NREPL_SERVER_TIMEOUT (seconds 60))
(def ^:const BACKEND_TESTS_NREPL_SERVER_PORT 7230)                                                                            ; -1000 from defaults
(def ^:const BACKEND_TESTS_NREPL_TUNNEL_PORT 7231)                                                                            ; -1000 from defaults
(def ^:const BACKEND_TESTS_WEASEL_PORT 7232)                                                                                  ; -1000 from defaults

(def ^:const BROWSER_TESTS_DIRAC_AGENT_PORT 8021)
(def ^:const BROWSER_TESTS_NREPL_SERVER_PORT 8020)

(def ^:const DIRAC_AGENT_BOOT_TIME (seconds 2))
(def ^:const TRANSCRIPT_MATCH_TIMEOUT (seconds 5))
(def ^:const LAUNCH_TASK_KEY "diracLaunchTask")
(def ^:const LAUNCH_TASK_MESSAGE "dirac-launch-task")

(def ^:const MARION_INITIAL_WAIT_TIME (seconds 1))
(def ^:const MARION_RECONNECTION_ATTEMPT_DELAY (seconds 2))
(def ^:const MARION_MESSAGE_REPLY_TIMEOUT (seconds 5))

(def ^:const DEFAULT_TASK_TIMEOUT (minutes 5))
(def ^:const DEFAULT_TEST_HTML_LOAD_TIMEOUT (seconds 1))
(def ^:const SIGNAL_SERVER_CLOSE_WAIT_TIMEOUT (seconds 1))

(def ^:const ACTUAL_TRANSCRIPTS_ROOT_PATH "test/browser/transcripts/actual/")
(def ^:const EXPECTED_TRANSCRIPTS_ROOT_PATH "test/browser/transcripts/expected/")

(def ^:const TRANSCRIPT_LABEL_PADDING_LENGTH 17)
(def ^:const TRANSCRIPT_LABEL_PADDING_TYPE :right)

(def ^:const BROWSER_CONNECTION_MINIMAL_COOLDOWN (seconds 4))
(def ^:const SCRIPT_RUNNER_LAUNCH_DELAY (seconds 1))

(def ^:const FIXTURES_SERVER_HOST "localhost")
(def ^:const FIXTURES_SERVER_PORT 9090)

(def ^:const SIGNAL_SERVER_HOST "localhost")
(def ^:const SIGNAL_SERVER_PORT 22555)

(def dirac-window-top (env :dirac-window-top))
(def dirac-window-left (env :dirac-window-left))
(def dirac-window-width (env :dirac-window-width))
(def dirac-window-height (env :dirac-window-height))

; -- macro wrappers ---------------------------------------------------------------------------------------------------------
; macros allow us to potentially expose the constants to cljs

(defmacro get-backend-tests-nrepl-server-timeout []
  BACKEND_TESTS_NREPL_SERVER_TIMEOUT)

(defmacro get-backend-tests-nrepl-server-port []
  BACKEND_TESTS_NREPL_SERVER_PORT)

(defmacro get-backend-tests-nrepl-tunnel-port []
  BACKEND_TESTS_NREPL_TUNNEL_PORT)

(defmacro get-backend-tests-weasel-port []
  BACKEND_TESTS_WEASEL_PORT)

(defmacro get-browser-tests-dirac-agent-port []
  BROWSER_TESTS_DIRAC_AGENT_PORT)

(defmacro get-browser-tests-nrepl-server-port []
  BROWSER_TESTS_NREPL_SERVER_PORT)

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

(defmacro get-dirac-window-top []
  dirac-window-top)

(defmacro get-dirac-window-left []
  dirac-window-left)

(defmacro get-dirac-window-width []
  dirac-window-width)

(defmacro get-dirac-window-height []
  dirac-window-height)

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