(ns dirac.agent.config
  (:require [dirac.lib.utils :refer [assoc-env-val deep-merge-ignoring-nils]]))

(def default-config
  {:log-level                 "WARN"                                                                                          ; OFF, FATAL, ERROR, WARN, INFO, DEBUG, TRACE, ALL
   :max-boot-trials           10
   :initial-boot-delay        1000
   :delay-between-boot-trials 500
   :skip-logging-setup        false
   :nrepl-server              {:host "localhost"
                               :port 8230}
   :nrepl-tunnel              {:host "localhost"
                               :port 8231}})

; -- environment ------------------------------------------------------------------------------------------------------------

(defn get-environ-config []
  (-> {}
      (assoc-env-val [:log-level] :dirac-agent-log-level)
      (assoc-env-val [:log-out] :dirac-agent-log-out)
      (assoc-env-val [:skip-logging-setup] :dirac-agent-skip-logging-setup :bool)
      (assoc-env-val [:max-boot-trials] :dirac-agent-max-boot-trials :int)
      (assoc-env-val [:initial-boot-delay] :dirac-agent-initial-boot-delay :int)
      (assoc-env-val [:delay-between-boot-trials] :dirac-agent-delay-between-boot-trials :int)
      (assoc-env-val [:nrepl-server :host] :dirac-nrepl-server-host)
      (assoc-env-val [:nrepl-server :port] :dirac-nrepl-server-port :int)
      (assoc-env-val [:nrepl-tunnel :host] :dirac-agent-host)
      (assoc-env-val [:nrepl-tunnel :port] :dirac-agent-port :int)))

; -- config evaluation ------------------------------------------------------------------------------------------------------

(defn get-effective-config* [& [config]]
  (let [environ-config (get-environ-config)]
    (or (deep-merge-ignoring-nils default-config environ-config config) {})))

(def ^:dynamic get-effective-config (memoize get-effective-config*))                                                          ; assuming environ-config is constant
