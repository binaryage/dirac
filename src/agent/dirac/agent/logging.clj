(ns dirac.agent.logging
  (require [clj-logging-config.log4j :as config]
           [dirac.lib.logging :as logging]
           [dirac.lib.utils :as utils]))

(def base-options
  {:pattern (str (utils/wrap-with-ansi-color utils/ANSI_YELLOW "# %m") "%n")})

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! [& [config]]
  (let [options (utils/config->logging-options config)]
    (logging/setup-logging! options)
    (config/set-loggers!
      "dirac.agent" (utils/make-logging-options base-options options)
      "dirac.agent.logging" (utils/make-logging-options base-options options)
      "dirac.agent.config" (utils/make-logging-options base-options options))))