(ns dirac.tests.backend.agent.tests
  (:require [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [dirac.agent :as agent]
            [dirac.project :refer [version]]
            [dirac.settings :refer [get-backend-tests-nrepl-server-host
                                    get-backend-tests-nrepl-server-port
                                    get-backend-tests-nrepl-server-url
                                    get-backend-tests-nrepl-tunnel-host
                                    get-backend-tests-nrepl-tunnel-port
                                    get-backend-tests-nrepl-tunnel-url
                                    get-backend-tests-weasel-host
                                    get-backend-tests-weasel-port]]
            [dirac.test-lib.mock-nrepl-tunnel-client :as tunnel-client]
            [dirac.test-lib.mock-weasel-client :as weasel-client]
            [dirac.tests.backend.agent.fixtures :as fixtures]
            [dirac.tests.backend.agent.helpers :refer [expect-event! expect-ns-msg! expect-op-msg!
                                                       expect-status-msg! get-last-message]]
            [dirac.tests.backend.agent.state :refer [received-messages]]))

(use-fixtures :once fixtures/setup-test-nrepl-server!)

; -- protocol templates -----------------------------------------------------------------------------------------------------

(defn make-bootstrap-dirac-repl-message []
  {:op   "eval"
   :code (pr-str `(do
                    (~'require '~'dirac.nrepl)
                    (dirac.nrepl/boot-dirac-repl! {:weasel-repl {:host ~(get-backend-tests-weasel-host)
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
          tunnel-url (get-backend-tests-nrepl-tunnel-url)
          agent-output (with-out-str
                         @(agent/boot! {:nrepl-server {:host server-host
                                                       :port server-port}
                                        :nrepl-tunnel {:host tunnel-host
                                                       :port tunnel-port}}))]
      (is (.contains agent-output (str "Connected to nREPL server at " server-url)))
      (is (.contains agent-output (str "Agent is accepting connections at " tunnel-url)))
      (log/info "dirac agent started on" tunnel-port)
      (let [tunnel (tunnel-client/create! tunnel-url)]
        (expect-event! tunnel :open)
        (tunnel-client/send! tunnel {:op      :ready
                                     :version version})
        (expect-op-msg! tunnel :bootstrap)
        (tunnel-client/send! tunnel (nrepl-message (make-bootstrap-dirac-repl-message)))
        (expect-op-msg! tunnel :bootstrap-info)
        (let [weasel (weasel-client/create! (:weasel-url (get-last-message)))]
          (expect-event! weasel :open)
          (weasel-client/send! weasel {:op :ready :ident (str weasel)})
          (expect-op-msg! weasel :eval-js)
          (weasel-client/send! weasel {:op      :result
                                       :eval-id (:eval-id (get-last-message))
                                       :value   (success-value)})
          (expect-op-msg! weasel :eval-js)
          (weasel-client/send! weasel {:op      :result
                                       :eval-id (:eval-id (get-last-message))
                                       :value   (success-value)})
          (expect-op-msg! weasel :eval-js)
          (weasel-client/send! weasel {:op      :result
                                       :eval-id (:eval-id (get-last-message))
                                       :value   (success-value)})
          ; TODO: review this, we should introduce special :op for prompt refresh
          ;(expect-ns-msg! tunnel "cljs.user")
          ;(expect-ns-msg! tunnel "cljs.user")
          ;(expect-status-msg! tunnel ["done"])
          (tunnel-client/send! tunnel {:op :bootstrap-done})))
      (agent/destroy!)
      (log/info "dirac agent stopped on" tunnel-port))))
