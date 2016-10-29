(ns dirac.agent.config
  (:require [dirac.lib.utils :refer [deep-merge-ignoring-nils read-env-config]]))

(def env-config-prefix "dirac-agent")

; you can override individual config keys via ENV variables, for example:
;   DIRAC_AGENT/LOG_LEVEL=debug or DIRAC_AGENT/NREPL_SERVER/PORT=7777
;
; see https://github.com/binaryage/env-config
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

; -- config evaluation ------------------------------------------------------------------------------------------------------

(defn get-effective-config* [& [config]]
  (let [env-config (read-env-config env-config-prefix)]
    (deep-merge-ignoring-nils default-config env-config config)))

(def ^:dynamic get-effective-config (memoize get-effective-config*))                                                          ; assuming env-config is constant
