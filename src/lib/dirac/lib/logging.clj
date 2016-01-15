(ns dirac.lib.logging
  (require [clj-logging-config.log4j :as config]
           [dirac.lib.utils :as utils]))

(def base-options
  {:level   :info
   :pattern (str (utils/wrap-with-ansi-color utils/ANSI_BLUE "# %m") "%n")})

(defn make-options [& [options]]
  (merge base-options options))

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! [options]
  (config/set-loggers!
    "dirac.lib.nrepl-client" (make-options options)
    "dirac.lib.nrepl-tunnel" (make-options options)
    "dirac.lib.nrepl-tunnel-server" (make-options options)
    "dirac.lib.weasel-server" (make-options options)
    "dirac.lib.ws-server" (make-options options)))