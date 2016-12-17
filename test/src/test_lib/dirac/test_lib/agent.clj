(ns dirac.test-lib.agent
  (:require [clojure.tools.logging :as log]
            [dirac.agent.impl :as agent]
            [dirac.settings :refer [get-dirac-agent-boot-time]]
            [dirac.travis :refer [with-travis-fold]]))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(defn setup-dirac-agent! []
  (log/debug "setup-dirac-agent!")
  (agent/boot!)
  (Thread/sleep (get-dirac-agent-boot-time)))                                                                                 ; wait for agent to boot up

(defn teardown-dirac-agent! []
  (log/debug "teardown-dirac-agent!")
  (agent/destroy!))

(defn with-dirac-agent [f]
  (with-travis-fold "Setup Dirac Agent" "setup-dirac-agent"
    (setup-dirac-agent!))
  (f)
  (with-travis-fold "Tear Dirac Agent down" "teardown-dirac-agent"
    (teardown-dirac-agent!)))
