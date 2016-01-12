(ns dirac.nrepl.logging
  (require [clj-logging-config.log4j :as config]
           [dirac.lib.logging :as logging]
           [dirac.lib.utils :as utils]))

(def base-options
  {:level   :info
   :pattern (str (utils/wrap-with-ansi-color utils/ANSI_GREEN "# %m") "%n")})

(defn make-options [& [options]]
  (merge base-options options))

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! []
  (logging/setup-logging!)
  (config/set-loggers!
    "dirac.nrepl" (make-options)
    "dirac.nrepl.middleware" (make-options)
    "dirac.nrepl.piggieback" (make-options)
    "dirac.nrepl.piggieback-hacks" (make-options)))