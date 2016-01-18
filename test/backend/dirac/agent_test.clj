(ns dirac.agent-test
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer [deftest is]]
            [clojure.tools.nrepl.ack :as nrepl.ack]
            [clojure.tools.nrepl.server :as nrepl.server]
            [dirac.agent :as agent]
            [dirac.nrepl.middleware :as middleware]
            [dirac.test.mock-tunnel-client :as tunnel-client]
            [dirac.test.logging :as logging]
            [clojure.tools.logging :as log]))

(def default-server-timeout (* 60 1000))
(def test-nrepl-server-port 8120)                                                                                             ; -100 from defaults
(def test-nrepl-tunnel-port 8121)
(def current-nrepl-server (atom nil))

(defn get-nrepl-server-handler-with-dirac-middleware []
  (nrepl.server/default-handler #'middleware/dirac-repl))

(def ack-server
  (delay (nrepl.server/start-server
           :bind "localhost"
           :handler (nrepl.ack/handle-ack nrepl.server/unknown-op))))

(defn start-nrepl-server! [& [port]]
  (nrepl.ack/reset-ack-port!)
  (let [ack-port (:port @ack-server)
        nrepl-server (nrepl.server/start-server
                       :bind "localhost"
                       :port (or port test-nrepl-server-port)
                       :ack-port ack-port
                       :handler (get-nrepl-server-handler-with-dirac-middleware))]
    (if-let [repl-port (nrepl.ack/wait-for-ack default-server-timeout)]
      (do
        (reset! current-nrepl-server nrepl-server)
        repl-port)
      (do
        (println "REPL server launch timed out.")
        (is false)
        nil))))

(defn expect-msg! [client expected-op]
  (let [channel (tunnel-client/get-channel client)
        [event & [{:keys [op session]}]] (<!! channel)]
    (is (= event :msg))
    (is (= op expected-op))))

; -- test -------------------------------------------------------------------------------------------------------------------

(deftest simple-interaction
  (logging/setup-logging! {:log-out   :console
                           :log-level "ALL"})
  (let [repl-port (start-nrepl-server!)]
    (log/info "nrepl server started at" repl-port)
    (is (= repl-port test-nrepl-server-port))
    (let [out (with-out-str
                @(agent/boot! {:log-level    "ALL"
                               :nrepl-server {:port test-nrepl-server-port}
                               :nrepl-tunnel {:port test-nrepl-tunnel-port}}))
          expected-out #"(?s).*Connected to nREPL server at nrepl://localhost:8120. Tunnel is accepting connections at ws://localhost:8121.*"]
      (is (not (nil? (re-matches expected-out out))))
      (log/info "dirac agent started at" test-nrepl-tunnel-port)
      (let [client (tunnel-client/create! (str "ws://localhost:" test-nrepl-tunnel-port))
            channel (tunnel-client/get-channel client)]
        (is (= :open (first (<!! channel))))
        (tunnel-client/send! client {:op :ready})
        (expect-msg! client :bootstrap)))))