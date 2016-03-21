(ns dirac.test.agent
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [dirac.agent-impl :as agent]
            [dirac.test.nrepl-server :as nrepl-server]
            [clojure.tools.logging :as log]))

(def test-dirac-agent-port 8021)
(def ^:const DIRAC_AGENT_BOOT_TIME 2000)

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(defn setup-dirac-agent! []
  (log/info "setup-dirac-agent")
  (agent/boot! {:nrepl-server {:port nrepl-server/test-runner-nrepl-server-port}
                :nrepl-tunnel {:port test-dirac-agent-port}})
  (Thread/sleep DIRAC_AGENT_BOOT_TIME))                                                                                       ; wait for agent to boot up

(defn teardown-dirac-agent! []
  (log/info "teardown-dirac-agent")
  (agent/destroy!))

(defn with-dirac-agent [f]
  (setup-dirac-agent!)
  (f)
  (teardown-dirac-agent!))