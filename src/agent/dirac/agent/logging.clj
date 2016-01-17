(ns dirac.agent.logging
  (require [clj-logging-config.log4j :as config]
           [dirac.lib.logging :as logging]
           [dirac.lib.utils :as utils]))

(def base-options
  {:level   :info
   :pattern (str (utils/wrap-with-ansi-color utils/ANSI_YELLOW "# %m") "%n")})

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! [& [config]]
  (let [options (utils/config->options config)]
    (logging/setup-logging! options)
    (config/set-loggers!
      "dirac.agent" (utils/make-options base-options options)
      "dirac.agent.logging" (utils/make-options base-options options)
      "dirac.agent.config" (utils/make-options base-options options))))