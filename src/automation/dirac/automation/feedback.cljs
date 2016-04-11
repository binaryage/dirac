(ns dirac.automation.feedback
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [dirac.automation.messages :as messages]
            [dirac.automation.transcript-host :as transcript-host]))

(defn transcript-append! [label message & [devtools-id]]
  (let [label (if devtools-id
                (str label " #" devtools-id)
                label)]
    (transcript-host/append-to-transcript! label message)))

(defn process-event! [event]
  (if-let [data (oget event "data")]
    (case (oget data "type")
      "feedback-from-dirac-frontend" (transcript-append! "frontend" (oget data "transcript") (oget data "devtools"))
      "feedback-from-dirac-extension" (transcript-append! "extension" (oget data "transcript"))
      "reply" (messages/process-reply! data)
      nil)))

(defn init-feedback! []
  (.addEventListener js/window "message" process-event!)
  (messages/post-message! #js {:type "marion-subscribe-transcript"}))