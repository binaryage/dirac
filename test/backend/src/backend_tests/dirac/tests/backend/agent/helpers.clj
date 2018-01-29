(ns dirac.tests.backend.agent.helpers
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [clojure.pprint :refer [pprint]]
            [dirac.tests.backend.agent.state :refer [received-messages]]))

(def ^:dynamic default-message-timeout 10000)

(defn report-error! [msg]
  (log/error "Received messages:\n" (with-out-str (pprint @received-messages)))
  (throw (ex-info msg {})))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-last-message []
  (second (last @received-messages)))

(defn wait-for-next-event! [client & [timeout-ms]]
  (let [timeout-chan (timeout (or timeout-ms default-message-timeout))
        client-chan (:channel client)
        [event chan] (alts!! [client-chan timeout-chan])]
    (if (= chan timeout-chan)
      (report-error! "timeouted while waiting for next client event")
      (do
        (swap! received-messages conj event)
        event))))

(defn expect-event! [client expected-event]
  (let [[event] (wait-for-next-event! client)]
    (is (= event expected-event))))

(defn expect-op-msg! [client expected-op]
  (let [[event & [{:keys [op]}]] (wait-for-next-event! client)]
    (is (= event :msg))
    (is (= (keyword op) expected-op))))

(defn expect-status-msg! [client expected-status]
  (let [[event & [{:keys [status]} :as msg]] (wait-for-next-event! client)]
    (is (= event :msg))
    (is (= status expected-status) (str "msg=" (pr-str msg)))))

(defn expect-ns-msg! [client expected-ns]
  (let [[event & [{:keys [ns]}]] (wait-for-next-event! client)]
    (is (= event :msg))
    (is (= ns expected-ns))))
