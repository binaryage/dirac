(ns dirac.agent-test
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [dirac.test.nrepl-server-helpers :refer [start-nrepl-server! stop-nrepl-server! test-nrepl-server-port]]
            [dirac.agent :as agent]
            [dirac.test.mock-tunnel-client :as tunnel-client]
            [dirac.test.logging :as logging]
            [clojure.tools.logging :as log]))

(def test-nrepl-tunnel-port 8121)
(def log-level "ALL")                                                                                                         ; INFO, DEBUG, TRACE, ALL

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn expect-msg! [client expected-op]
  (let [channel (tunnel-client/get-channel client)
        [event & [{:keys [op]}]] (<!! channel)]
    (is (= event :msg))
    (is (= op expected-op))))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(def current-nrepl-server (atom nil))
(def current-nrepl-server-port (atom nil))

(defn setup-tests []
  (logging/setup-logging! {:log-out   :console
                           :log-level log-level})
  (if-let [[server port] (start-nrepl-server!)]
    (do
      (log/info "nrepl server started on" port)
      (reset! current-nrepl-server server)
      (reset! current-nrepl-server-port port))
    (println "nREPL server start timeouted/failed")))

(defn teardown-tests []
  (when-let [current-server @current-nrepl-server]
    (stop-nrepl-server! current-server)
    (log/info "nrepl server stopped on" @current-nrepl-server-port)
    (reset! current-nrepl-server nil)
    (reset! current-nrepl-server-port nil)))

(defn setup [f]
  (setup-tests)
  (f)
  (teardown-tests))

(use-fixtures :once setup)

; -- test -------------------------------------------------------------------------------------------------------------------

(deftest simple-interaction
  (testing "happy path"
    (let [out (with-out-str
                @(agent/boot! {:log-level    log-level
                               :nrepl-server {:port test-nrepl-server-port}
                               :nrepl-tunnel {:port test-nrepl-tunnel-port}}))
          expected-out #"(?s).*Connected to nREPL server at nrepl://localhost:8120. Tunnel is accepting connections at ws://localhost:8121.*"]
      (is (not (nil? (re-matches expected-out out))))
      (log/info "dirac agent started at" test-nrepl-tunnel-port)
      (let [client (tunnel-client/create! (str "ws://localhost:" test-nrepl-tunnel-port))
            channel (tunnel-client/get-channel client)]
        (is (= :open (first (<!! channel))))
        (tunnel-client/send! client {:op :ready})
        (expect-msg! client :bootstrap)
        (agent/destroy!)))))