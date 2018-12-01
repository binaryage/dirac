(ns marion.background.notifications
  (:require [chromex.protocols.chrome-port :as chrome-port]
            [dirac.shared.async :refer [<! go go-channel go-wait]]
            [marion.background.helpers :as helpers]
            [marion.background.logging :refer [error info log warn]]
            [oops.core :refer [oapply ocall oget]]))

; "notifications" are events sent from task runner to scenario page
;
; currently there should be only one subscriber (the currently running scenario page)
; but the code is general enough to handle multiple subscribers

(defonce subscribers (atom []))

(defn get-subscribers []
  @subscribers)

; -- subscriber manipulation ------------------------------------------------------------------------------------------------

(defn is-client-subscribed? [client]
  (boolean (some #{client} (get-subscribers))))

(defn subscribe-client! [client]
  (swap! subscribers conj client)
  (log "a client subscribed to notifications:" (helpers/get-client-url client)))

(defn unsubscribe-client! [client]
  (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
    (swap! subscribers remove-item client))
  (log "a client unsubscribed from notifications:" (helpers/get-client-url client)))

(defn unsubscribe-client-if-subscribed! [client]
  (if (is-client-subscribed? client)
    (unsubscribe-client! client)))

; -- broadcasting -----------------------------------------------------------------------------------------------------------

(defn broadcast-notification! [message]
  (go
    (let [subscribers (get-subscribers)]
      (if-not (pos? (count subscribers))
        (warn "notification broadcast request while no subscribers registered" message)
        (doseq [subscriber subscribers]
          (chrome-port/post-message! subscriber message))))))
