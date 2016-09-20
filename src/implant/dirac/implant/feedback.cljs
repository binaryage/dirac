(ns dirac.implant.feedback
  (:require [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.settings :refer-macros [get-flush-pending-feedback-messages-key
                                           get-dirac-intercom-key]]
            [dirac.implant.options :as options]))

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
  (when (options/should-automate?)
    (oset! js/window (str "!" (get-flush-pending-feedback-messages-key)) flush-pending-messages!)))

(defn post! [text]
  (when (options/should-automate?)
    (let [debug? (oget js/window "dirac" "_DEBUG_FEEDBACK")
          message #js {:type     "marion-deliver-feedback"
                       :envelope #js {:type       "feedback-from-devtools"
                                      :devtools   (options/get-devtools-id)
                                      :transcript text}}]
      (if debug?
        (log "posting feedback:" message))
      (if-let [intercom (get-intercom)]
        (intercom message)
        (do
          (if debug?
            (log "intercom not yet ready, queuing feedback message" message))
          (swap! pending-messages conj message))))))
