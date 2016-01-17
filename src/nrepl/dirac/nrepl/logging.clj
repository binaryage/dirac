(ns dirac.nrepl.logging
  (require [clj-logging-config.log4j :as config]
           [dirac.lib.logging :as logging]
           [dirac.lib.utils :as utils]))

(def base-options
  {:pattern (str (utils/wrap-with-ansi-color utils/ANSI_GREEN "# %m") "%n")})

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! [& [config]]
  (let [options (utils/config->logging-options config)]
    (logging/setup-logging! options)
    (config/set-loggers!
      "dirac.nrepl" (utils/make-logging-options base-options options)
      "dirac.nrepl.middleware" (utils/make-logging-options base-options options)
      "dirac.nrepl.piggieback" (utils/make-logging-options base-options options))))