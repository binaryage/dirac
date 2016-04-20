(ns dirac.automation.feedback
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn]]
            [dirac.automation.messages :as messages]
            [dirac.automation.transcript-host :as transcript-host]))

(def processing-messages? (volatile! false))
(def trancript-subscribed? (volatile! false))

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
  (if-not @processing-messages?
    (do
      (.addEventListener js/window "message" process-event!)
      (vreset! processing-messages? true))
    (warn "start-processing-messages! called while already started => ignoring this call")))

(defn stop-processing-messages! []
  (if @processing-messages?
    (do
      (.removeEventListener js/window "message" process-event!)
      (vreset! processing-messages? false))
    (warn "stop-processing-messages! called while not yet started => ignoring this call")))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn subscribe-to-transcript! []
  (go
    (if-not @trancript-subscribed?
      (do
        (<! (messages/post-message! #js {:type "marion-subscribe-transcript"}))
        (vreset! trancript-subscribed? true))
      (warn "subscribe-to-transcript! called while already subscribed => ignoring this call"))))

(defn unsubscribe-from-transcript! []
  (go
    (if @trancript-subscribed?
      (do
        (<! (messages/post-message! #js {:type "marion-unsubscribe-transcript"}))
        (vreset! trancript-subscribed? false))
      (warn "subscribe-to-transcript! called while not yet subscribed => ignoring this call"))))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn init-feedback! []
  (start-processing-messages!)
  (subscribe-to-transcript!))