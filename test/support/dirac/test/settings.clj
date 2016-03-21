(ns dirac.test.settings)

; we want this stuff to be accessible both from clojure and clojurescript

(def ^:const TEST_DIRAC_AGENT_PORT 8021)
(def ^:const DIRAC_AGENT_BOOT_TIME 2000)
(def ^:const TEST_NREPL_SERVER_PORT 8020)

; -- cljs access ------------------------------------------------------------------------------------------------------------

(defmacro get-test-dirac-agent-port []
  TEST_DIRAC_AGENT_PORT)

(defmacro get-dirac-agent-boot-time []
  DIRAC_AGENT_BOOT_TIME)

(defmacro get-test-nrepl-server-port []
  TEST_NREPL_SERVER_PORT)