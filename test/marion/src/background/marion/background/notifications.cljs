(ns marion.background.notifications
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [marion.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan timeout]]
            [chromex.protocols :refer [post-message! get-sender]]
            [chromex.support :refer-macros [oget ocall oapply]]))

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
  (let [sender (get-sender client)
        sender-url (oget sender "url")]
    (log "a client subscribed to notifications:" sender-url)
    (swap! subscribers conj client)))

(defn unsubscribe-client! [client]
  (let [sender (get-sender client)
        sender-url (oget sender "url")]
    (log "a client unsubscribed from notifications:" sender-url)
    (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
      (swap! subscribers remove-item client))))

(defn unsubscribe-client-if-subscribed! [client]
  (if (is-client-subscribed? client)
    (unsubscribe-client! client)))

; -- broadcasting -----------------------------------------------------------------------------------------------------------

(defn broadcast-notification! [message]
  (let [subscribers (get-subscribers)]
    (if-not (pos? (count subscribers))
      (warn "notification broadcast request while no subscribers registered" message)
      (doseq [subscriber subscribers]
        (post-message! subscriber message)))))
