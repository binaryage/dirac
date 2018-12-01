(ns marion.background.clients
  (:require [chromex.protocols.chrome-port :as chrome-port]
            [dirac.shared.async :refer [<! go go-channel go-wait]]
            [marion.background.feedback :as feedback]
            [marion.background.helpers :as helpers]
            [marion.background.logging :refer [error info log warn]]
            [marion.background.notifications :as notifications]
            [oops.core :refer [oapply ocall oget]]))

; clients are marion content scripts connected to this marion background page:
;   * some clients may be scenario pages
;   * up to one client should be the current task runner

(defonce clients (atom []))

; -- clients manipulation ---------------------------------------------------------------------------------------------------

(defn add-client! [client]
  (let [sender (chrome-port/get-sender client)]
    (swap! clients conj client)
    (log (str "a client connected: " (helpers/get-client-url client) " total clients " (count @clients)) sender)))

(defn remove-client! [client]
  (let [sender (chrome-port/get-sender client)]
    (feedback/unsubscribe-client-if-subscribed! client)
    (notifications/unsubscribe-client-if-subscribed! client)
    (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
      (swap! clients remove-item client))
    (log (str "a client disconnected: " (helpers/get-client-url client) " total clients " (count @clients)) sender)))
