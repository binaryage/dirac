(ns dirac.test.agent
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [dirac.agent-impl :as agent]
            [dirac.test.settings :refer [get-test-dirac-agent-port get-dirac-agent-boot-time
                                         get-test-nrepl-server-port]]
            [clojure.tools.logging :as log]))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(defn setup-dirac-agent! []
  (log/info "setup-dirac-agent")
  (agent/boot! {:nrepl-server {:port (get-test-nrepl-server-port)}
                :nrepl-tunnel {:port (get-test-dirac-agent-port)}})
  (Thread/sleep (get-dirac-agent-boot-time)))                                                                                 ; wait for agent to boot up

(defn teardown-dirac-agent! []
  (log/info "teardown-dirac-agent")
  (agent/destroy!))

(defn with-dirac-agent [f]
  (setup-dirac-agent!)
  (f)
  (teardown-dirac-agent!))