(ns dirac.automation.notifications
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log warn]]
            [dirac.automation.messages :as messages]
            [cljs.reader :as reader]))

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

(defn broadcast-notification! [notification]
  (messages/broadcast-notification! (serialize-notification notification)))

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
      (.addEventListener js/window "message" process-event!)
      (vreset! processing-messages? true))))

(defn stop-processing-messages! []
  (if-not (is-processing-messages?)
    (warn "stop-processing-messages! called while not yet started => ignoring this call")
    (do
      (.removeEventListener js/window "message" process-event!)
      (vreset! processing-messages? false))))

; -- notifications subscription ---------------------------------------------------------------------------------------------

(defn subscribe-to-notifications! []
  (if (is-notifications-subscribed?)
    (warn "subscribe-to-notifications! called while already subscribed => ignoring this call")
    (do
      (messages/post-message! #js {:type "marion-subscribe-notifications"} :no-timeout)
      (vreset! notifications-subscribed? true))))

(defn unsubscribe-from-notifications! []
  (if-not (is-notifications-subscribed?)
    (warn "unsubscribe-from-notifications! called while not yet subscribed => ignoring this call")
    (do
      (messages/post-message! #js {:type "marion-unsubscribe-notifications"} :no-timeout)
      (vreset! notifications-subscribed? false))))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn init! []
  (start-processing-messages!)
  (subscribe-to-notifications!))

(defn done! []
  (unsubscribe-from-notifications!)
  (stop-processing-messages!))
