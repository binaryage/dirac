(ns dirac.test.nrepl-server-helpers
  (:require [clojure.tools.nrepl.ack :as nrepl.ack]
            [clojure.tools.nrepl.server :as nrepl.server]
            [dirac.settings :refer [get-backend-tests-nrepl-server-timeout
                                    get-backend-tests-nrepl-server-host
                                    get-backend-tests-nrepl-server-port
                                    get-backend-tests-nrepl-ack-server-host]]
            [dirac.nrepl.middleware :as middleware]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-nrepl-server-handler-with-dirac-middleware []
  (nrepl.server/default-handler #'middleware/dirac-repl))

(defn start-ack-server! [host]
  (nrepl.server/start-server
    :bind host
    :handler (nrepl.ack/handle-ack nrepl.server/unknown-op)))

(defn start-nrepl-server! [& [port timeout]]
  (nrepl.ack/reset-ack-port!)
  (let [ack-server (start-ack-server! (get-backend-tests-nrepl-ack-server-host))
        effective-port (or port (get-backend-tests-nrepl-server-port))
        effective-host (get-backend-tests-nrepl-server-host)
        effective-timeout (or timeout (get-backend-tests-nrepl-server-timeout))
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