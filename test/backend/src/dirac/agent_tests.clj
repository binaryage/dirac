(ns dirac.agent-tests
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [dirac.settings :refer [get-backend-tests-nrepl-server-port
                                    get-backend-tests-nrepl-tunnel-port
                                    get-backend-tests-weasel-port]]
            [dirac.test.nrepl-server-helpers :refer [start-nrepl-server! stop-nrepl-server!]]
            [dirac.agent :as agent]
            [dirac.project :refer [version]]
            [dirac.test.mock-nrepl-tunnel-client :as tunnel-client]
            [dirac.test.mock-weasel-client :as weasel-client]
            [clojure.tools.logging :as log]))

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
              "  (dirac.nrepl/boot-cljs-repl! {:skip-logging-setup true"                                                      ; we are running nrepl code in the same process, logging was already setup by our test runner
              "                                :weasel-repl {:host \"localhost\""
              "                                              :port " (get-backend-tests-weasel-port) "}}))")})

(defn nrepl-message [envelope]
  {:op       :nrepl-message
   :envelope envelope})

; -- test -------------------------------------------------------------------------------------------------------------------

(deftest simple-interaction
  (testing "happy path"
    (let [tunnel-port (get-backend-tests-nrepl-tunnel-port)
          server-port (get-backend-tests-nrepl-server-port)
          actual-out (with-out-str
                       @(agent/boot! {:skip-logging-setup true                                                                ; logging was already setup by our test runner
                                      :nrepl-server       {:port server-port}
                                      :nrepl-tunnel       {:port tunnel-port}}))
          expected-out #"(?s).*Connected to nREPL server at nrepl://localhost:7230.\nTunnel is accepting connections at ws://localhost:7231.*"]
      (is (some? (re-matches expected-out actual-out)))
      (log/info "dirac agent started at" tunnel-port)
      (let [tunnel (tunnel-client/create! (str "ws://localhost:" tunnel-port))]
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