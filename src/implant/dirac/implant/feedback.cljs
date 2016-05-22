(ns dirac.implant.feedback
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.settings :refer-macros [get-flush-pending-feedback-messages-key
                                           get-dirac-intercom-key]]
            [dirac.implant.helpers :as helpers]))

(defonce pending-messages (atom []))

(defn get-intercom []
  (oget js/window (get-dirac-intercom-key)))

(defn flush-pending-messages! []
  (let [messages @pending-messages]
    (reset! pending-messages [])
    (log "flush-pending-messages!" messages)
    (let [intercom (get-intercom)]
      (assert intercom)
      (doseq [message messages]
        (intercom message)))))

(defn install! []
  (when (helpers/should-automate?)
    (oset js/window [(get-flush-pending-feedback-messages-key)] flush-pending-messages!)))

(defn post! [text]
  (when (helpers/should-automate?)
    (let [message #js {:type     "marion-deliver-feedback"
                       :envelope #js {:type       "feedback-from-devtools"
                                      :devtools   (helpers/get-devtools-id)
                                      :transcript text}}]
      (log "posting feedback:" message)
      (if-let [intercom (get-intercom)]
        (intercom message)
        (do
          (log "intercom not yet ready, queuing feedback message" message)
          (swap! pending-messages conj message))))))