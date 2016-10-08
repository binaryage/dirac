(ns dirac.tests.backend.agent.helpers
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [dirac.tests.backend.agent.state :refer [last-msg]]))

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
    (is (= status expected-status) (str "msg=" (pr-str msg)))))

(defn expect-ns-msg! [client expected-ns]
  (let [[event & [{:keys [ns]} :as msg]] (<!! (:channel client))]
    (is (= event :msg))
    (vreset! last-msg msg)
    (is (= ns expected-ns))))
