(ns dirac.implant.feedback
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.implant.helpers :as helpers]))

(defonce pending-messages (atom []))

(defn get-intercom []
  (oget js/window "diracExtensionIntercom"))                                                                                  ; TODO: move to settings

(defn flush-pending-messages! []
  (let [messages @pending-messages]
    (reset! pending-messages [])
    (log "flush-pending-messages!" messages)
    (let [intercom (get-intercom)]
      (assert intercom)
      (doseq [message messages]
        (intercom message)))))

(defn install! []
  (oset js/window ["diracFlushPendingFeedbackMessages"] flush-pending-messages!))                                             ; TODO: move to settings

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