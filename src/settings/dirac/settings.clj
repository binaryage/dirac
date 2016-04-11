(ns dirac.settings)

; we want this stuff to be accessible both from clojure and clojurescript

(def ^:const SECOND 1000)
(def ^:const MINUTE (* 60 SECOND))

(def ^:const TEST_DIRAC_AGENT_PORT 8021)
(def ^:const TEST_NREPL_SERVER_PORT 8020)
(def ^:const DIRAC_AGENT_BOOT_TIME (* 2 SECOND))
(def ^:const TRANSCRIPT_MATCH_TIMEOUT (* 5 SECOND))
(def ^:const LAUNCH_TASK_KEY "diracLaunchTask")
(def ^:const LAUNCH_TASK_MESSAGE "dirac-launch-task")

(def ^:const MARION_INITIAL_WAIT_TIME (* 1 SECOND))
(def ^:const MARION_RECONNECTION_ATTEMPT_DELAY (* 2 SECOND))
(def ^:const MARION_MESSAGE_REPLY_TIMEOUT (* 5 SECOND))

(def ^:const DEFAULT_TASK_TIMEOUT (* 5 MINUTE))
(def ^:const DEFAULT_TEST_HTML_LOAD_TIMEOUT (* 1 SECOND))
(def ^:const SIGNAL_SERVER_CLOSE_WAIT_TIMEOUT (* 1 SECOND))

(def ^:const ACTUAL_TRANSCRIPTS_ROOT_PATH "test/browser/transcripts/actual/")
(def ^:const EXPECTED_TRANSCRIPTS_ROOT_PATH "test/browser/transcripts/expected/")

; -- cljs access ------------------------------------------------------------------------------------------------------------

(defmacro get-test-dirac-agent-port []
  TEST_DIRAC_AGENT_PORT)

(defmacro get-dirac-agent-boot-time []
  DIRAC_AGENT_BOOT_TIME)

(defmacro get-test-nrepl-server-port []
  TEST_NREPL_SERVER_PORT)

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