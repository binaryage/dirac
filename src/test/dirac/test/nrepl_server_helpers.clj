(ns dirac.test.nrepl-server-helpers
  (:require [clojure.tools.nrepl.ack :as nrepl.ack]
            [clojure.tools.nrepl.server :as nrepl.server]
            [dirac.settings :refer [get-backend-tests-nrepl-server-timeout get-backend-tests-nrepl-server-port]]
            [dirac.nrepl.middleware :as middleware]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-nrepl-server-handler-with-dirac-middleware []
  (nrepl.server/default-handler #'middleware/dirac-repl))

(defn start-ack-server! []
  (nrepl.server/start-server
    :bind "localhost"
    :handler (nrepl.ack/handle-ack nrepl.server/unknown-op)))

(defn start-nrepl-server! [& [port timeout]]
  (nrepl.ack/reset-ack-port!)
  (let [ack-server (start-ack-server!)
        ack-port (:port ack-server)
        nrepl-server (nrepl.server/start-server
                       :bind "localhost"
                       :port (or port (get-backend-tests-nrepl-server-port))
                       :ack-port ack-port
                       :handler (get-nrepl-server-handler-with-dirac-middleware))]
    (when-let [repl-port (nrepl.ack/wait-for-ack (or timeout (get-backend-tests-nrepl-server-timeout)))]
      (nrepl.server/stop-server ack-server)
      [nrepl-server repl-port])))

(defn stop-nrepl-server! [server]
  (nrepl.server/stop-server server))