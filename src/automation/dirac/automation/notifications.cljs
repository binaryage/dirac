(ns dirac.automation.notifications
  (:require [cljs.reader :as reader]
            [dirac.automation.logging :refer [log warn]]
            [dirac.automation.messages :as messages]
            [oops.core :refer [gcall! oapply ocall oget oset!]]))

(defonce processing-messages? (volatile! false))
(defonce notifications-subscribed? (volatile! false))
(defonce notifications-subscribers (atom #{}))                                                                                ; a set of callbacks

; -- accessors --------------------------------------------------------------------------------------------------------------

(defn is-processing-messages? []
  @processing-messages?)

(defn is-notifications-subscribed? []
  @notifications-subscribed?)

(defn get-notifications-subscribers []
  @notifications-subscribers)

(defn subscribe-notifications! [callback]
  (swap! notifications-subscribers conj callback))

(defn unsubscribe-notifications! [callback]
  (swap! notifications-subscribers disj callback))

; -- serialization ----------------------------------------------------------------------------------------------------------

(defn unserialize-notification [serialized-notification]
  (reader/read-string serialized-notification))

(defn serialize-notification [notification]
  (pr-str notification))

; -- sending ----------------------------------------------------------------------------------------------------------------

(defn go-broadcast-notification! [notification]
  (messages/go-broadcast-notification! (serialize-notification notification)))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn process-notification! [serialized-notification]
  (let [notification (unserialize-notification serialized-notification)]
    (doseq [subscriber (get-notifications-subscribers)]
      (subscriber notification))))

(defn process-event! [event]
  (let [data (oget event "data")]
    (case (oget data "type")
      "notification" (process-notification! (oget data "notification"))
      nil)))

(defn start-processing-messages! []
  (if (is-processing-messages?)
    (warn "start-processing-messages! called while already started => ignoring this call")
    (do
      (gcall! "addEventListener" "message" process-event!)
      (vreset! processing-messages? true))))

(defn stop-processing-messages! []
  (if-not (is-processing-messages?)
    (warn "stop-processing-messages! called while not yet started => ignoring this call")
    (do
      (gcall! "removeEventListener" "message" process-event!)
      (vreset! processing-messages? false))))

; -- notifications subscription ---------------------------------------------------------------------------------------------

(defn subscribe-to-notifications! []
  (if (is-notifications-subscribed?)
    (warn "subscribe-to-notifications! called while already subscribed => ignoring this call")
    (do
      (messages/go-post-message! #js {:type "marion-subscribe-notifications"} :no-timeout)
      (vreset! notifications-subscribed? true))))

(defn unsubscribe-from-notifications! []
  (if-not (is-notifications-subscribed?)
    (warn "unsubscribe-from-notifications! called while not yet subscribed => ignoring this call")
    (do
      (messages/go-post-message! #js {:type "marion-unsubscribe-notifications"} :no-timeout)
      (vreset! notifications-subscribed? false))))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn init! []
  (start-processing-messages!)
  (subscribe-to-notifications!))

(defn done! []
  (unsubscribe-from-notifications!)
  (stop-processing-messages!))
