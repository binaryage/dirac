(ns dirac.test-lib.agent
  (:require [clojure.tools.logging :as log]
            [dirac.agent-impl :as agent]
            [dirac.settings :refer [get-dirac-agent-boot-time]]))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(defn setup-dirac-agent! []
  (log/debug "setup-dirac-agent!")
  (agent/boot!)
  (Thread/sleep (get-dirac-agent-boot-time)))                                                                                 ; wait for agent to boot up

(defn teardown-dirac-agent! []
  (log/debug "teardown-dirac-agent!")
  (agent/destroy!))

(defn with-dirac-agent [f]
  (setup-dirac-agent!)
  (f)
  (teardown-dirac-agent!))
