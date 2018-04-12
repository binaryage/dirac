(ns marion.background.feedback
  (:require [dirac.shared.async :refer [<! go-channel go-wait go]]
            [chromex.protocols :refer [post-message! get-sender]]
            [oops.core :refer [oget ocall oapply]]
            [marion.background.logging :refer [log info warn error]]
            [marion.background.helpers :as helpers]))

; "feedback" are events logged via calling feedback() from dirac extension and dirac frontends
; feedback messages should be delivered to current task runner to be appended to current transcript
;
; currently there should be only one subscriber (the currently running task runner)
; but the code is general enough to handle multiple subscribers

(defonce subscribers (atom []))

(defn get-subscribers []
  @subscribers)

; -- subscriber manipulation ------------------------------------------------------------------------------------------------

(defn is-client-subscribed? [client]
  (boolean (some #{client} (get-subscribers))))

(defn subscribe-client! [client]
  (swap! subscribers conj client)
  (log "a client subscribed to feedback:" (helpers/get-client-url client)))

(defn unsubscribe-client! [client]
  (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
    (swap! subscribers remove-item client))
  (log "a client unsubscribed from feedback:" (helpers/get-client-url client)))

(defn unsubscribe-client-if-subscribed! [client]
  (if (is-client-subscribed? client)
    (unsubscribe-client! client)))

; -- broadcasting -----------------------------------------------------------------------------------------------------------

(defn go-broadcast-feedback! [message]
  (go
    (let [subscribers (get-subscribers)]
      (if-not (pos? (count subscribers))
        (warn "feedback broadcast request while no subscribers registered" message)
        (doseq [subscriber subscribers]
          (try
            (post-message! subscriber message)
            (catch :default e
              (warn "cannot post message to a client subscribed to feedback" (helpers/get-client-url subscriber) "\n" e)
              nil)))))))
