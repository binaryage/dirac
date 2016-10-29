(ns dirac.test-lib.nrepl-server-helpers
  (:require [clojure.tools.nrepl.ack :as nrepl.ack]
            [clojure.tools.nrepl.server :as nrepl.server]
            [environ.core :refer [env]]
            [dirac.settings :refer [get-backend-tests-nrepl-server-timeout
                                    get-backend-tests-nrepl-server-host
                                    get-backend-tests-nrepl-server-port]]
            [dirac.nrepl :as dirac-repl]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-nrepl-server-handler-with-dirac-middleware []
  (nrepl.server/default-handler #'dirac-repl/middleware))

(defn start-ack-server! [host]
  (nrepl.server/start-server
    :bind host
    :handler (nrepl.ack/handle-ack nrepl.server/unknown-op)))

(defn start-nrepl-server! [& [host port timeout]]
  (nrepl.ack/reset-ack-port!)
  (let [effective-port (Integer/parseInt (str (or port (env :dirac-setup-nrepl-server-port) (get-backend-tests-nrepl-server-port))))
        effective-host (or host (env :dirac-setup-nrepl-server-host) (get-backend-tests-nrepl-server-host))
        effective-timeout (or timeout (get-backend-tests-nrepl-server-timeout))
        ack-server (start-ack-server! effective-host)
        nrepl-server (nrepl.server/start-server
                       :bind effective-host
                       :port effective-port
                       :ack-port (:port ack-server)
                       :handler (get-nrepl-server-handler-with-dirac-middleware))]
    (when-let [repl-port (nrepl.ack/wait-for-ack effective-timeout)]
      (nrepl.server/stop-server ack-server)
      [nrepl-server repl-port])))

(defn stop-nrepl-server! [server]
  (nrepl.server/stop-server server))
