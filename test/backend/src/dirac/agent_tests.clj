(ns dirac.agent-tests
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [dirac.test.nrepl-server-helpers :refer [start-nrepl-server! stop-nrepl-server! test-nrepl-server-port]]
            [dirac.agent :as agent]
            [dirac.project :refer [version]]
            [dirac.test.mock-nrepl-tunnel-client :as tunnel-client]
            [dirac.test.mock-weasel-client :as weasel-client]
            [dirac.test.logging :as logging]
            [clojure.tools.logging :as log]))

(def test-nrepl-tunnel-port 7231)                                                                                             ; -1000 from defaults
(def test-weasel-port 7232)                                                                                                   ; -1000 from defaults
(def log-level "INFO")                                                                                                        ; INFO, DEBUG, TRACE, ALL
(def last-msg (volatile! nil))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn expect-event! [client expected-event]
  (let [[event] (<!! (:channel client))]
    (is (= event expected-event))))

(defn expect-op-msg! [client expected-op]
  (let [[event & [{:keys [op] :as msg}]] (<!! (:channel client))]
    (is (= event :msg))
    (vreset! last-msg msg)
    (is (= (keyword op) expected-op))))

(defn expect-status-msg! [client expected-status]
  (let [[event & [{:keys [status]} :as msg]] (<!! (:channel client))]
    (is (= event :msg))
    (vreset! last-msg msg)
    (is (= status expected-status))))

(defn expect-ns-msg! [client expected-ns]
  (let [[event & [{:keys [ns]} :as msg]] (<!! (:channel client))]
    (is (= event :msg))
    (vreset! last-msg msg)
    (is (= ns expected-ns))))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(def current-nrepl-server (atom nil))
(def current-nrepl-server-port (atom nil))

(defn setup-tests []
  (logging/setup-logging! {:log-out   :console
                           :log-level log-level})
  (log/info "setup")
  (if-let [[server port] (start-nrepl-server!)]
    (do
      (log/info "nrepl server started on" port)
      (reset! current-nrepl-server server)
      (reset! current-nrepl-server-port port))
    (log/error "nREPL server start timeouted/failed")))

(defn teardown-tests []
  (log/info "teardown")
  (when-let [current-server @current-nrepl-server]
    (stop-nrepl-server! current-server)
    (log/info "nrepl server on" @current-nrepl-server-port "stopped")
    (reset! current-nrepl-server nil)
    (reset! current-nrepl-server-port nil)))

(defn setup [f]
  (setup-tests)
  (f)
  (teardown-tests))

(use-fixtures :once setup)

(defn boostrap-cljs-repl-message []
  {:op   "eval"
   :code (str "(do"
              "  (require 'dirac.nrepl)"
              "  (dirac.nrepl/boot-cljs-repl! {:log-level \"" log-level "\""
              "                                :weasel-repl {:host \"localhost\""
              "                                              :port " test-weasel-port "}}))")})

(defn nrepl-message [envelope]
  {:op       :nrepl-message
   :envelope envelope})

; -- test -------------------------------------------------------------------------------------------------------------------

(deftest simple-interaction
  (testing "happy path"
    (let [actual-out (with-out-str
                       @(agent/boot! {:log-level    log-level
                                      :nrepl-server {:port test-nrepl-server-port}
                                      :nrepl-tunnel {:port test-nrepl-tunnel-port}}))
          expected-out #"(?s).*Connected to nREPL server at nrepl://localhost:7230.\nTunnel is accepting connections at ws://localhost:7231.*"]
      (is (some? (re-matches expected-out actual-out)))
      (log/info "dirac agent started at" test-nrepl-tunnel-port)
      (let [tunnel (tunnel-client/create! (str "ws://localhost:" test-nrepl-tunnel-port))]
        (expect-event! tunnel :open)
        (tunnel-client/send! tunnel {:op      :ready
                                     :version version})
        (expect-op-msg! tunnel :bootstrap)
        (tunnel-client/send! tunnel (nrepl-message (boostrap-cljs-repl-message)))
        (expect-op-msg! tunnel :bootstrap-info)
        (let [weasel (weasel-client/create! (:server-url @last-msg))]
          (expect-event! weasel :open)
          (expect-op-msg! weasel :eval-js)
          (weasel-client/send! weasel {:op :result :value {:status :success
                                                           :value  ""}})
          (expect-op-msg! weasel :eval-js)
          (weasel-client/send! weasel {:op :result :value {:status :success
                                                           :value  ""}})
          (expect-ns-msg! tunnel "cljs.user")
          (expect-status-msg! tunnel ["done"])
          (tunnel-client/send! tunnel {:op :bootstrap-done})))
      (agent/destroy!))))