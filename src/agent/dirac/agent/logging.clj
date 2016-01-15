(ns dirac.agent.logging
  (require [clj-logging-config.log4j :as config]
           [dirac.lib.logging :as logging]
           [dirac.lib.utils :as utils])
  (:import (org.apache.log4j Level)))

(def base-options
  {:level   :info
   :pattern (str (utils/wrap-with-ansi-color utils/ANSI_YELLOW "# %m") "%n")})

(defn make-options [& [options]]
  (merge base-options options))

(defn config->options [config]
  (if-let [log-level (:log-level config)]
    (let [level (Level/toLevel log-level Level/INFO)]
      {:level level})))

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! [config]
  (let [options (config->options config)]
    (logging/setup-logging! options)
    (config/set-loggers!
      "dirac.agent" (make-options options)
      "dirac.agent.logging" (make-options options)
      "dirac.agent.config" (make-options options))))