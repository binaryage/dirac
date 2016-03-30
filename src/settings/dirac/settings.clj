(ns dirac.settings)

; we want this stuff to be accessible both from clojure and clojurescript

(def ^:const TEST_DIRAC_AGENT_PORT 8021)
(def ^:const DIRAC_AGENT_BOOT_TIME 2000)
(def ^:const TEST_NREPL_SERVER_PORT 8020)
(def ^:const LAUNCH_TASK_KEY "diracLaunchTask")
(def ^:const LAUNCH_TASK_MESSAGE "dirac-launch-task")
(def ^:const TRANSCRIPT_MATCH_TIMEOUT 5000)

(def ^:const MARION_INITIAL_WAIT_TIME 1000)
(def ^:const MARION_RECONNECTION_ATTEMPT_DELAY 2000)
(def ^:const MARION_MESSAGE_REPLY_TIME 2000)

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

(defmacro get-marion-message-reply-time []
  MARION_MESSAGE_REPLY_TIME)