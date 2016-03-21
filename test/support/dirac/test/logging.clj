(ns dirac.test.logging
  (require [clj-logging-config.log4j :as config]
           [dirac.lib.utils :as utils]))

(def base-options
  {:pattern (str (utils/wrap-with-ansi-color utils/ANSI_MAGENTA "# %m") "%n")})

(def root-options
  {:pattern (str (utils/wrap-with-ansi-color utils/ANSI_CYAN "# %m") "%n")})

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! [& [config]]
  (let [options (utils/config->logging-options config)]
    (config/set-loggers!
      :root (utils/make-logging-options root-options options)
      "dirac.agent-tests" (utils/make-logging-options base-options options)
      "dirac.test.mock-nrepl-tunnel-client" (utils/make-logging-options base-options options)
      "dirac.test.mock-weasel-client" (utils/make-logging-options base-options options))))