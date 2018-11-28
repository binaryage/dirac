(ns dirac.background.marion
  (:require [chromex.protocols.chrome-port :as chrome-port]
            [cljs.reader :as reader]
            [dirac.background.helpers :as helpers]
            [dirac.background.logging :refer [error info log warn]]
            [dirac.background.state :as state]
            [dirac.options.model :as options]
            [dirac.shared.async :refer [<! go go-channel put!]]
            [dirac.shared.utils :as utils]
            [oops.core :refer [oapply ocall oget]]))

(declare post-feedback-event!)

; -- marion event handlers --------------------------------------------------------------------------------------------------

(defn go-set-options! [message-id message]
  (go
    (let [options (:options message)]
      (post-feedback-event! (str "set extension options:" (pr-str options)))
      (options/set-options! options)
      (state/post-reply! message-id))))

(defn go-get-options! [message-id _message]
  (go
    (state/post-reply! message-id (options/get-options))))

(defn go-reset-options! [message-id message]
  (go
    (let [options (:options message)]
      (post-feedback-event! (str "reset extension options:" (pr-str options)))
      (options/reset-options! options)
      (state/post-reply! message-id))))

(defn go-reset-state! [message-id _message]
  (go
    (post-feedback-event! (str "reset extension state"))
    (options/reset-to-defaults!)
    (state/reset-devtools-id-counter!)
    (state/post-reply! message-id)))

(defn go-fire-synthetic-chrome-event! [context message-id message]
  (go
    (let [handler-fn (:chrome-event-handler context)
          _ (assert (fn? handler-fn))
          chrome-event (:chrome-event message)
          reply (<! (handler-fn chrome-event))]
      (state/post-reply! message-id reply))))

(defn go-automate-dirac-frontend! [message-id message]
  (go
    (let [{:keys [action]} message
          devtools-id (utils/parse-int (:devtools-id message))]
      (log "automate-dirac-frontend!" (str "#" devtools-id) action message)
      (if (state/get-devtools-descriptor devtools-id)
        (let [reply (<! (helpers/go-automate-devtools! devtools-id action))]
          (state/post-raw-reply! message-id reply))
        (do
          (warn "dirac automation request for missing connection" (str "#" devtools-id) message
                "existing connections:" (state/get-devtools-descriptors))
          (state/post-reply! message-id ::missing-connection))))))

(defn go-tear-down! [message-id _message]
  (go
    ; we want to close all tabs/windows opened (owned) by our extension
    ; chrome driver does not have access to those windows and fails to switch back to its own tab
    ; https://bugs.chromium.org/p/chromium/issues/detail?id=355075
    (<! (helpers/go-close-all-extension-tabs!))
    (state/post-reply! message-id)))

; -- marion event loop ------------------------------------------------------------------------------------------------------

(defn register-marion! [marion-port]
  (log "marion connected" (chrome-port/get-sender marion-port))
  (when-some [existing-marion-port (state/get-marion-port)]
    (warn "overwriting previous marion port!" (chrome-port/get-sender existing-marion-port) existing-marion-port))
  (state/set-marion-port! marion-port))

(defn unregister-marion! []
  (if-some [marion-port (state/get-marion-port)]
    (do
      (log "marion disconnected" (chrome-port/get-sender marion-port) marion-port)
      (state/set-marion-port! nil))
    (warn "unregister-marion! called when no previous marion port!")))

(defn go-process-marion-message! [context data]
  (let [message-id (oget data "id")
        payload (oget data "payload")
        message (reader/read-string payload)
        command (:command message)]
    (log "process-marion-message" message-id command message)
    (case command
      :get-options (go-get-options! message-id message)
      :reset-options (go-reset-options! message-id message)
      :set-options (go-set-options! message-id message)
      :reset-state (go-reset-state! message-id message)
      :fire-synthetic-chrome-event (go-fire-synthetic-chrome-event! context message-id message)
      :automate-dirac-frontend (go-automate-dirac-frontend! message-id message)
      :tear-down (go-tear-down! message-id message))))

(defn go-run-marion-message-loop! [context marion-port]
  (go
    (register-marion! marion-port)
    (loop []
      (when-some [data (<! marion-port)]
        (<! (go-process-marion-message! context data))
        (recur)))
    (unregister-marion!)))

; -- marion client connection handling --------------------------------------------------------------------------------------

(defn go-handle-marion-client-connection! [context marion-port]
  (go-run-marion-message-loop! context marion-port))

(defn post-feedback-event! [& args]
  (apply state/post-feedback! args))
