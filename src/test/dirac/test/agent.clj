(ns dirac.test.agent
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [dirac.agent-impl :as agent]
            [dirac.settings :refer [get-dirac-agent-boot-time]]
            [clojure.tools.logging :as log]))

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
