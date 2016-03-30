(ns dirac.fixtures.feedback
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [dirac.fixtures.messages :as messages]
            [dirac.fixtures.transcript-host :as transcript-host]))

(defn transcript-append! [label message & [connection-id]]
  (let [label (if connection-id
                (str label " #" connection-id)
                label)]
    (transcript-host/append-to-transcript! label message)))

(defn process-event! [event]
  (if-let [data (oget event "data")]
    (case (oget data "type")
      "feedback-from-dirac-frontend" (transcript-append! "frontend" (oget data "transcript") (oget data "connectionId"))
      "feedback-from-dirac-extension" (transcript-append! "extension" (oget data "transcript"))
      "reply" (messages/process-reply! data)
      nil)))

(defn init-feedback! []
  (.addEventListener js/window "message" process-event!)
  (messages/post-message! #js {:type "marion-subscribe-transcript"}))