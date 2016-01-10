(ns dirac.agent.config
  (require [clojure.tools.logging :as log]
           [dirac.lib.utils :refer [assoc-env-val]]))

(def nrepl-server-default-config
  {:host "localhost"
   :port 9010})

(def nrepl-tunnel-default-config
  {:host "localhost"
   :port 9050})

(def default-config
  {:max-boot-trials           10
   :delay-between-boot-trials 500
   :skip-logging-setup        false
   :nrepl-server              nrepl-server-default-config
   :nrepl-tunnel              nrepl-tunnel-default-config})

; -- environment ------------------------------------------------------------------------------------------------------------

(defn get-environ-config []
  (-> {}
      (assoc-env-val [:max-boot-trials] :dirac-agent-max-boot-trials :int)
      (assoc-env-val [:delay-between-boot-trials] :dirac-agent-delay-between-boot-trials :int)
      (assoc-env-val [:skip-logging-setup] :dirac-agent-skip-logging-setup :bool)
      (assoc-env-val [:nrepl-server :host] :dirac-nrepl-server-host)
      (assoc-env-val [:nrepl-server :port] :dirac-nrepl-server-port :int)
      (assoc-env-val [:nrepl-tunnel :host] :dirac-nrepl-tunnel-host)
      (assoc-env-val [:nrepl-tunnel :port] :dirac-nrepl-tunnel-port :int)))

; -- config evaluation ------------------------------------------------------------------------------------------------------

(defn deep-merge
  "Recursively merges maps. If keys are not maps, the last value wins."
  [& vals]
  (if (every? map? vals)
    (apply merge-with deep-merge vals)
    (last vals)))

(defn get-effective-config* [& [config]]
  (let [environ-config (get-environ-config)]
    (log/debug "default config:" default-config)
    (log/debug "environ config:" environ-config)
    (log/debug "ad-hoc config:" config)
    (log/debug "---------------")
    (let [effective-config (deep-merge default-config environ-config (or config {}))]
      (log/debug "effective config: " effective-config)
      effective-config)))

(def ^:dynamic get-effective-config (memoize get-effective-config*))                                                          ; assuming environ-config is constant