(ns dirac.agent-tests
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [dirac.settings :refer [get-backend-tests-nrepl-server-host
                                    get-backend-tests-nrepl-server-port
                                    get-backend-tests-nrepl-server-url
                                    get-backend-tests-nrepl-tunnel-host
                                    get-backend-tests-nrepl-tunnel-port
                                    get-backend-tests-nrepl-tunnel-url
                                    get-backend-tests-weasel-host
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
  (log/debug "setup-tests")
  (if-let [[server port] (start-nrepl-server! (get-backend-tests-nrepl-server-host) (get-backend-tests-nrepl-server-port))]
    (do
      (log/info "nrepl server started on" port)
      (reset! current-nrepl-server server)
      (reset! current-nrepl-server-port port))
    (log/error "nREPL server start timeouted/failed")))

(defn teardown-tests []
  (log/debug "teardown-tests")
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

(defn make-boostrap-dirac-repl-message []
  {:op   "eval"
   :code (pr-str `(do
                    (~'require '~'dirac.nrepl)
                    (dirac.nrepl/boot-dirac-repl! {:skip-logging-setup true                                                   ; we are running nrepl code in the same process, logging was already setup by our test runner
                                                   :weasel-repl        {:host ~(get-backend-tests-weasel-host)
                                                                        :port ~(get-backend-tests-weasel-port)}})))})

(defn nrepl-message [envelope]
  {:op       :nrepl-message
   :envelope envelope})

(defn success-value [& [opts]]
  (merge {:status :success} opts))

; -- test -------------------------------------------------------------------------------------------------------------------

(deftest simple-interaction
  (testing "happy path"
    (let [server-host (get-backend-tests-nrepl-server-host)
          server-port (get-backend-tests-nrepl-server-port)
          server-url (get-backend-tests-nrepl-server-url)
          tunnel-host (get-backend-tests-nrepl-tunnel-host)
          tunnel-port (get-backend-tests-nrepl-tunnel-port)
          tunner-url (get-backend-tests-nrepl-tunnel-url)
          agent-output (with-out-str
                         @(agent/boot! {:skip-logging-setup true                                                              ; logging was already setup by our test runner
                                        :nrepl-server       {:host server-host
                                                             :port server-port}
                                        :nrepl-tunnel       {:host tunnel-host
                                                             :port tunnel-port}}))]
      (is (.contains agent-output (str "Connected to nREPL server at " server-url)))
      (is (.contains agent-output (str "Agent is accepting connections at " tunner-url)))
      (log/info "dirac agent started on" tunnel-port)
      (let [tunnel (tunnel-client/create! tunner-url)]
        (expect-event! tunnel :open)
        (tunnel-client/send! tunnel {:op      :ready
                                     :version version})
        (expect-op-msg! tunnel :bootstrap)
        (tunnel-client/send! tunnel (nrepl-message (make-boostrap-dirac-repl-message)))
        (expect-op-msg! tunnel :bootstrap-info)
        (let [weasel (weasel-client/create! (:weasel-url @last-msg))]
          (expect-event! weasel :open)
          (weasel-client/send! weasel {:op :ready :ident (str weasel)})
          (expect-op-msg! weasel :eval-js)
          (weasel-client/send! weasel {:op :result :value (success-value)})
          (expect-op-msg! weasel :eval-js)
          (weasel-client/send! weasel {:op :result :value (success-value)})
          (expect-ns-msg! tunnel "cljs.user")
          (expect-status-msg! tunnel ["done"])
          (tunnel-client/send! tunnel {:op :bootstrap-done})))
      (agent/destroy!)
      (log/info "dirac agent destroyed on" tunnel-port))))