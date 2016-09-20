(ns dirac.automation.feedback
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log warn]]
            [dirac.automation.messages :as messages]
            [dirac.automation.transcript-host :as transcript-host]))

(defonce processing-messages? (volatile! false))
(defonce feedback-subscribed? (volatile! false))

; -- accessors --------------------------------------------------------------------------------------------------------------

(defn is-processing-messages? []
  @processing-messages?)

(defn is-feedback-subscribed? []
  @feedback-subscribed?)

; -- handlers ---------------------------------------------------------------------------------------------------------------

(defn format-label [label devtools-id]
  (if devtools-id
    (str label " #" devtools-id)
    label))

(defn append-to-transcript! [label message & [devtools-id]]
  (transcript-host/append-to-transcript! (format-label label devtools-id) message))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn process-event! [event]
  (if-let [data (oget event "?data")]
    (case (oget data "?type")
      "feedback-from-devtools" (append-to-transcript! "devtools" (oget data "transcript") (oget data "devtools"))
      "feedback-from-extension" (append-to-transcript! "extension" (oget data "transcript"))
      "feedback-from-scenario" (append-to-transcript! (or (oget data "?label") "scenario") (oget data "transcript"))
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

; -- transcript subscription ------------------------------------------------------------------------------------------------

(defn subscribe-to-feedback! []
  (if (is-feedback-subscribed?)
    (warn "subscribe-to-feedback! called while already subscribed => ignoring this call")
    (do
      (messages/post-message! #js {:type "marion-subscribe-feedback"} :no-timeout)
      (vreset! feedback-subscribed? true))))

(defn unsubscribe-from-feedback! []
  (if-not (is-feedback-subscribed?)
    (warn "unsubscribe-from-feedback! called while not yet subscribed => ignoring this call")
    (do
      (messages/post-message! #js {:type "marion-unsubscribe-feedback"} :no-timeout)
      (vreset! feedback-subscribed? false))))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn init! []
  (start-processing-messages!)
  (subscribe-to-feedback!))

(defn done! []
  (unsubscribe-from-feedback!)
  (stop-processing-messages!))
