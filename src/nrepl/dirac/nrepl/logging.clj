(ns dirac.nrepl.logging
  (require [clj-logging-config.log4j :as config]
           [dirac.lib.logging :as logging]
           [dirac.lib.utils :as utils]))

(def base-options
  {:level   :info
   :pattern (str (utils/wrap-with-ansi-color utils/ANSI_GREEN "# %m") "%n")})

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! [& [config]]
  (let [options (utils/config->options config)]
    (logging/setup-logging! options)
    (config/set-loggers!
      "dirac.nrepl" (utils/make-options base-options options)
      "dirac.nrepl.middleware" (utils/make-options base-options options)
      "dirac.nrepl.piggieback" (utils/make-options base-options options)
      "dirac.nrepl.piggieback-hacks" (utils/make-options base-options options))))