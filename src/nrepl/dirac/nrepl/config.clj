(ns dirac.nrepl.config
  (require [dirac.lib.utils :refer [assoc-env-val deep-merge-ignoring-nils]]))

(def default-config
  {:log-out            :console                                                                                               ; this is important, nREPL middleware captures output and logs be sent to client
   :log-level          "WARN"                                                                                                 ; OFF, FATAL, ERROR, WARN, INFO, DEBUG, TRACE, ALL
   :skip-logging-setup false
   :weasel-repl        {:host  "localhost"
                        :port  8232
                        :range 10}})                                                                                          ; how many ports to try if the default port is taken

; -- environment ------------------------------------------------------------------------------------------------------------

(defn get-environ-config []
  (-> {}
      (assoc-env-val [:log-level] :dirac-nrepl-log-level)
      (assoc-env-val [:log-out] :dirac-nrepl-log-out)
      (assoc-env-val [:skip-logging-setup] :dirac-nrepl-skip-logging-setup :bool)
      (assoc-env-val [:weasel-repl :host] :dirac-nrepl-weasel-host)
      (assoc-env-val [:weasel-repl :port] :dirac-nrepl-weasel-port :int)
      (assoc-env-val [:weasel-repl :range] :dirac-nrepl-weasel-range :int)))

; -- config evaluation ------------------------------------------------------------------------------------------------------

(defn get-effective-config* [& [config]]
  (let [environ-config (get-environ-config)]
    (or (deep-merge-ignoring-nils default-config environ-config config) {})))

(def ^:dynamic get-effective-config (memoize get-effective-config*))                                                          ; assuming environ-config is constant