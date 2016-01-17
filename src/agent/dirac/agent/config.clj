(ns dirac.agent.config
  (require [dirac.lib.utils :refer [assoc-env-val]]))

(def nrepl-server-default-config
  {:host "localhost"
   :port 8230})

(def nrepl-tunnel-default-config
  {:host "localhost"
   :port 8231})

(def default-config
  {:log-level                 "WARN"                                                                                          ; OFF, FATAL, ERROR, WARN, INFO, DEBUG, TRACE, ALL
   :max-boot-trials           10
   :initial-boot-delay        1000
   :delay-between-boot-trials 500
   :skip-logging-setup        false
   :nrepl-server              nrepl-server-default-config
   :nrepl-tunnel              nrepl-tunnel-default-config})

; -- environment ------------------------------------------------------------------------------------------------------------

(defn get-environ-config []
  (-> {}
      (assoc-env-val [:log-level] :dirac-agent-log-level)
      (assoc-env-val [:skip-logging-setup] :dirac-agent-skip-logging-setup :bool)
      (assoc-env-val [:max-boot-trials] :dirac-agent-max-boot-trials :int)
      (assoc-env-val [:initial-boot-delay] :dirac-agent-initial-boot-delay :int)
      (assoc-env-val [:delay-between-boot-trials] :dirac-agent-delay-between-boot-trials :int)
      (assoc-env-val [:nrepl-server :host] :dirac-nrepl-server-host)
      (assoc-env-val [:nrepl-server :port] :dirac-nrepl-server-port :int)
      (assoc-env-val [:nrepl-tunnel :host] :dirac-nrepl-tunnel-host)
      (assoc-env-val [:nrepl-tunnel :port] :dirac-nrepl-tunnel-port :int)))

; -- config evaluation ------------------------------------------------------------------------------------------------------

(defn deep-merge-ignoring-nils
  "Recursively merges maps. If keys are not maps, the last value wins. Nils are ignored."
  [& vals]
  (let [non-nil-vals (remove nil? vals)]
    (if (every? map? non-nil-vals)
      (apply merge-with deep-merge-ignoring-nils non-nil-vals)
      (last non-nil-vals))))

(defn get-effective-config* [& [config]]
  (let [environ-config (get-environ-config)]
    (let [effective-config (deep-merge-ignoring-nils default-config environ-config config)]
      (or effective-config {}))))

(def ^:dynamic get-effective-config (memoize get-effective-config*))                                                          ; assuming environ-config is constant