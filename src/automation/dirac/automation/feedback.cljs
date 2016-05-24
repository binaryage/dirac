(ns dirac.automation.feedback
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn]]
            [dirac.automation.messages :as messages]
            [dirac.automation.transcript-host :as transcript-host]))

(def processing-messages? (volatile! false))
(def trancript-subscribed? (volatile! false))

; -- accessors --------------------------------------------------------------------------------------------------------------

(defn is-processing-messages? []
  @processing-messages?)

(defn is-transcript-subscribed? []
  @trancript-subscribed?)

; -- handlers ---------------------------------------------------------------------------------------------------------------

(defn append-to-transcript! [label message & [devtools-id]]
  (let [label (if devtools-id
                (str label " #" devtools-id)
                label)]
    (transcript-host/append-to-transcript! label message)))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn process-event! [event]
  (if-let [data (oget event "data")]
    (case (oget data "type")
      "feedback-from-devtools" (append-to-transcript! "devtools" (oget data "transcript") (oget data "devtools"))
      "feedback-from-extension" (append-to-transcript! "extension" (oget data "transcript"))
      "reply" (messages/process-reply! data)
      nil)))

(defn start-processing-messages! []
  (if-not (is-processing-messages?)
    (do
      (.addEventListener js/window "message" process-event!)
      (vreset! processing-messages? true))
    (warn "start-processing-messages! called while already started => ignoring this call")))

(defn stop-processing-messages! []
  (if (is-processing-messages?)
    (do
      (.removeEventListener js/window "message" process-event!)
      (vreset! processing-messages? false))
    (warn "stop-processing-messages! called while not yet started => ignoring this call")))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn subscribe-to-transcript! []
  (if-not (is-transcript-subscribed?)
    (do
      (messages/post-message! #js {:type "marion-subscribe-transcript"} :no-timeout)
      (vreset! trancript-subscribed? true))
    (warn "subscribe-to-transcript! called while already subscribed => ignoring this call")))

(defn unsubscribe-from-transcript! []
  (if (is-transcript-subscribed?)
    (do
      (messages/post-message! #js {:type "marion-unsubscribe-transcript"} :no-timeout)
      (vreset! trancript-subscribed? false))
    (warn "subscribe-to-transcript! called while not yet subscribed => ignoring this call")))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn init-feedback! []
  (start-processing-messages!)
  (subscribe-to-transcript!))

(defn done-feedback! []
  (unsubscribe-from-transcript!)
  (stop-processing-messages!))