(ns dirac.tests.backend.agent.tests
  (:require [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [dirac.settings :refer [get-backend-tests-nrepl-server-host
                                    get-backend-tests-nrepl-server-port
                                    get-backend-tests-nrepl-server-url
                                    get-backend-tests-nrepl-tunnel-host
                                    get-backend-tests-nrepl-tunnel-port
                                    get-backend-tests-nrepl-tunnel-url
                                    get-backend-tests-weasel-host
                                    get-backend-tests-weasel-port]]
            [dirac.agent :as agent]
            [dirac.project :refer [version]]
            [dirac.test-lib.mock-nrepl-tunnel-client :as tunnel-client]
            [dirac.test-lib.mock-weasel-client :as weasel-client]
            [dirac.tests.backend.agent.fixtures :as fixtures]
            [dirac.tests.backend.agent.helpers :as helpers :refer [expect-event! expect-op-msg! expect-ns-msg!
                                                                   expect-status-msg!]]
            [dirac.tests.backend.agent.state :refer [last-msg]]))

(use-fixtures :once fixtures/setup-test-nrepl-server!)

; -- protocol templates -----------------------------------------------------------------------------------------------------

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

; -- tests ------------------------------------------------------------------------------------------------------------------

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
          (expect-ns-msg! tunnel "cljs.user")                                                                                 ; TODO: review this, we should introduce special :op for prompt refresh
          (expect-status-msg! tunnel ["done"])
          (tunnel-client/send! tunnel {:op :bootstrap-done})))
      (agent/destroy!)
      (log/info "dirac agent destroyed on" tunnel-port))))
