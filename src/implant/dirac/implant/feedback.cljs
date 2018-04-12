(ns dirac.implant.feedback
  (:require [oops.core :refer [oget oset! ocall oapply oset!+ oget+ gget gset!]]
            [dirac.implant.logging :refer [log warn error]]
            [dirac.settings :refer [get-flush-pending-feedback-messages-key
                                    get-dirac-intercom-key]]
            [dirac.implant.options :as options]))

(defonce pending-messages (atom []))

(defn get-intercom []
  (gget "?" (get-dirac-intercom-key)))

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
    (gset! "!" (get-flush-pending-feedback-messages-key) flush-pending-messages!)))

(defn post! [text]
  (when (options/should-automate?)
    (let [debug? (gget "dirac._DEBUG_FEEDBACK")
          message #js {:type     "marion-deliver-feedback"
                       :envelope #js {:type       "feedback-from-devtools"
                                      :devtools   (options/get-devtools-id)
                                      :transcript text}}]
      (when debug?
        (log "posting feedback:" message))
      (if-some [intercom (get-intercom)]
        (intercom message)
        (do
          (when debug?
            (log "intercom not yet ready, queuing feedback message" message))
          (swap! pending-messages conj message))))))
