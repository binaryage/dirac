(ns dirac.test.nrepl-server-helpers
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [clojure.tools.nrepl.ack :as nrepl.ack]
            [clojure.tools.nrepl.server :as nrepl.server]
            [dirac.nrepl.middleware :as middleware]))

(def nrepl-server-timeout (* 60 1000))
(def test-nrepl-server-port 7230)                                                                                             ; -1000 from defaults

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-nrepl-server-handler-with-dirac-middleware []
  (nrepl.server/default-handler #'middleware/dirac-repl))

(defn start-ack-server! []
  (nrepl.server/start-server
    :bind "localhost"
    :handler (nrepl.ack/handle-ack nrepl.server/unknown-op)))

(defn start-nrepl-server! [& [port]]
  (nrepl.ack/reset-ack-port!)
  (let [ack-server (start-ack-server!)
        ack-port (:port ack-server)
        nrepl-server (nrepl.server/start-server
                       :bind "localhost"
                       :port (or port test-nrepl-server-port)
                       :ack-port ack-port
                       :handler (get-nrepl-server-handler-with-dirac-middleware))]
    (when-let [repl-port (nrepl.ack/wait-for-ack nrepl-server-timeout)]
      (nrepl.server/stop-server ack-server)
      [nrepl-server repl-port])))

(defn stop-nrepl-server! [server]
  (nrepl.server/stop-server server))