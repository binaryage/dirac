(ns dirac.agent.logging
  (require [clj-logging-config.log4j :as config]))

; https://en.wikipedia.org/wiki/ANSI_escape_code
(def ^:const BLUE 34)

(defn wrap-with-ansi-color [color s]
  (str "\u001b[0;" color "m" s "\u001b[m"))

(def base-options
  {:level   :error
   :pattern (str (wrap-with-ansi-color BLUE "# %m") "%n")})

(defn make-options [& [options]]
  (merge base-options options))

; -- our default setup ------------------------------------------------------------------------------------------------------

(defn setup-logging! []
  (config/set-loggers!
    "dirac.agent" (make-options {:level :debug})
    "dirac.agent.nrepl-client" (make-options)
    "dirac.agent.nrepl-tunnel" (make-options)
    "dirac.agent.nrepl-tunnel-server" (make-options)
    "dirac.agent.weasel-server" (make-options)
    "dirac.agent.ws-server" (make-options)))