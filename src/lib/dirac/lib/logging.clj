(ns dirac.lib.logging
  (require [clj-logging-config.log4j :as config]
           [dirac.lib.utils :as utils]))

(def base-options
  {:pattern (str (utils/wrap-with-ansi-color utils/ANSI_BLUE "# %m") "%n")})

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! [options]
  (config/set-loggers!
    "dirac.lib.nrepl-client" (utils/make-logging-options base-options options)
    "dirac.lib.nrepl-tunnel" (utils/make-logging-options base-options options)
    "dirac.lib.nrepl-tunnel-server" (utils/make-logging-options base-options options)
    "dirac.lib.weasel-server" (utils/make-logging-options base-options options)
    "dirac.lib.ws-server" (utils/make-logging-options base-options options)))