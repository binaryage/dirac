(ns dirac.agent.config
  (require [environ.core :as environ]
           [clojure.string :as string]
           [clojure.tools.logging :as log]))

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

(defn env-val [key & [type]]
  (if-let [val (environ/env key)]
    (case type
      :bool (or (= val "1")
                (= (string/lower-case val) "true")
                (= (string/lower-case val) "yes"))
      :int (int val)
      (str val))))


(defn assoc-env-val [config ks key & [type]]
  (if-let [val (env-val key type)]
    (assoc-in config ks val)
    config))

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

(defn get-effective-config* [config]
  (let [environ-config (get-environ-config)]
    (log/debug "default config:" default-config)
    (log/debug "environ config:" environ-config)
    (log/debug "ad-hoc config:" config)
    (log/debug "---------------")
    (let [effective-config (deep-merge default-config environ-config (or config {}))]
      (log/debug "effective config: " effective-config)
      effective-config)))

(def ^:dynamic get-effective-config (memoize get-effective-config*))