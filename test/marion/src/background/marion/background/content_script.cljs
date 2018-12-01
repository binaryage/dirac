(ns marion.background.content-script
  (:require [chromex.protocols.chrome-port :as chrome-port]
            [dirac.settings :refer [get-marion-open-scenario-timeout]]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]
            [dirac.shared.utils :as utils]
            [goog.string :as gstring]
            [goog.string.format]
            [marion.background.clients :as clients]
            [marion.background.dirac :as dirac]
            [marion.background.feedback :as feedback]
            [marion.background.helpers :as helpers]
            [marion.background.logging :refer [error info log warn]]
            [marion.background.notifications :as notifications]
            [oops.core :refer [oapply ocall oget oset!]]))

; -- scenario ids -----------------------------------------------------------------------------------------------------------
; we want to provide stable mapping between tab-ids and scenario tabs
(defonce scenario-ids (atom {}))                                                                                              ; scenario-id -> tab-id
(defonce last-scenario-id (volatile! 0))

(defn get-next-scenario-id! []
  (str "scenario-tab#" (vswap! last-scenario-id inc)))

(defn reset-scenario-id! []
  (vreset! last-scenario-id 0))

(defn clear-scenario-ids! []
  (reset! scenario-ids {}))

(defn get-scenario-tab-id [scenario-id]
  {:pre  [(some? scenario-id)]
   :post [(some? %)]}
  (get @scenario-ids scenario-id))

(defn add-scenario-id! [scenario-id tab-id]
  {:pre [(some? scenario-id)
         (some? tab-id)
         (nil? (get @scenario-ids scenario-id))]}
  (swap! scenario-ids assoc scenario-id tab-id)
  (log "added scenario id" scenario-id "=>" tab-id))

(defn remove-scenario-id! [scenario-id]
  {:pre [(some? scenario-id)
         (some? (get-scenario-tab-id scenario-id))]}
  (swap! scenario-ids dissoc scenario-id)
  (log "removed scenario id" scenario-id))

; -- pending scenarios ------------------------------------------------------------------------------------------------------
; after opening a new tab with scenario URL, we wait for special signal from scenario page that it finished initialization
; and is ready for testing exercise
; in pending-scenarios we keep mappings from opened tab urls which have yet to be marked as "ready"

(defonce pending-scenarios (atom {}))                                                                                         ; scenario-url -> callback

(defn wait-for-scenario-ready! [scenario-url]
  (let [channel (go-channel)
        handler (fn [message]
                  (swap! pending-scenarios dissoc scenario-url)
                  (put! channel message))]
    (swap! pending-scenarios assoc scenario-url handler)
    channel))

; -- posting replies --------------------------------------------------------------------------------------------------------

(defn serialize-error [e]
  (pr-str (utils/make-error-struct e)))

(defn serialize-reply-data [data]
  (if (instance? js/Error data)
    (serialize-error data)
    (try
      (pr-str (utils/make-result-struct data))
      (catch :default e
        (serialize-error e)))))

(defn go-post-reply!
  ([message-id] (go-post-reply! message-id nil))
  ([message-id data]
   (let [message #js {:type "reply"
                      :id   message-id
                      :data (serialize-reply-data data)}]
     (log "broadcasting reply" message-id message)
     (feedback/go-broadcast-feedback! message))))

(defn go-reply-to-message! [message & [data]]
  (go-post-reply! (oget message "id") data))

; -- message handlers -------------------------------------------------------------------------------------------------------

(defn go-reset-state! [message]
  (go
    (reset-scenario-id!)
    (clear-scenario-ids!)
    (<! (go-reply-to-message! message))))

(defn go-subscribe-client-to-feedback! [message client]
  (go
    (feedback/subscribe-client! client)
    (<! (go-reply-to-message! message))))

(defn go-unsubscribe-client-from-feedback! [message client]
  (go
    (feedback/unsubscribe-client! client)
    (<! (go-reply-to-message! message))))

(defn go-subscribe-client-to-notifications! [message client]
  (go
    (notifications/subscribe-client! client)
    (<! (go-reply-to-message! message))))

(defn go-unsubscribe-client-from-notifications! [message client]
  (go
    (notifications/unsubscribe-client! client)
    (<! (go-reply-to-message! message))))

(defn go-open-scenario! [message]
  (go
    (let [scenario-url (oget message "url")                                                                                   ; something like http://localhost:9080/scenarios/normal.html
          scenario-id (get-next-scenario-id!)
          timeout-ms (get-marion-open-scenario-timeout)
          timeout-str (gstring/format "%0.2f" (/ timeout-ms 1000.0))
          timeout-channel (go-wait timeout-ms)
          ready-channel (wait-for-scenario-ready! scenario-url)
          tab-id (<! (helpers/go-create-scenario-with-url! scenario-url))]
      (let [[_ channel] (alts! [ready-channel timeout-channel])]
        (condp identical? channel
          ready-channel (do (add-scenario-id! scenario-id tab-id)
                            (<! (go-reply-to-message! message scenario-id)))
          timeout-channel (let [error-msg (str "Scenario " scenario-id " didn't get ready in time (" timeout-str "s), "
                                               "this is probably due to javascript errors during initialization.\n"
                                               "Inspect page '" scenario-url "'")]
                            (warn error-msg)
                            (<! (go-reply-to-message! message (str "error: " error-msg)))))))))

(defn go-close-scenario! [message]
  (go
    (let [scenario-id (oget message "scenario-id")
          tab-id (get-scenario-tab-id scenario-id)]
      (<! (helpers/go-close-tab-with-id! tab-id))
      (remove-scenario-id! scenario-id)
      (<! (go-reply-to-message! message)))))

(defn go-activate-scenario! [message]
  (go
    (let [scenario-id (oget message "scenario-id")
          tab-id (get-scenario-tab-id scenario-id)]
      (<! (helpers/go-activate-tab! tab-id))
      (<! (go-reply-to-message! message)))))

(defn go-scenario-ready! [message client]
  (go
    (let [sender (chrome-port/get-sender client)
          scenario-url (oget sender "url")]
      (log "scenario is ready" scenario-url)
      (if-let [callback (get @pending-scenarios scenario-url)]
        (callback message)
        (warn "expected " scenario-url " to be present in pending-scenarios")))
    (<! (go-reply-to-message! message))))

(defn go-switch-to-task-runner! [message]
  (go
    (when-let [tab-id (<! (helpers/go-find-runner-tab-id!))]
      (<! (helpers/go-activate-tab! tab-id))
      (<! (go-reply-to-message! message)))))

(defn go-focus-runner-window! [message]
  (go
    (when-let [tab-id (<! (helpers/go-find-runner-tab-id!))]
      (<! (helpers/go-focus-window-with-tab-id! tab-id))
      (<! (go-reply-to-message! message)))))

(defn go-reposition-runner-window! [message]
  (go
    (<! (helpers/go-reposition-runner-window!))
    (<! (go-reply-to-message! message))))

(defn go-close-all-tabs! [message]
  (go
    (<! (helpers/go-close-all-scenario-tabs!))
    (clear-scenario-ids!)
    (<! (go-reply-to-message! message))))

(defn go-handle-extension-command! [message]
  (dirac/go-post-message-to-dirac-extension! message))

(defn go-broadcast-feedback-from-scenario! [message]
  (go
    (<! (feedback/go-broadcast-feedback! (oget message "payload")))
    (<! (go-reply-to-message! message))))

(defn go-broadcast-notification! [message]
  (go
    (<! (notifications/broadcast-notification! (oget message "payload")))
    (<! (go-reply-to-message! message))))

; -- message dispatch -------------------------------------------------------------------------------------------------------

(defn go-process-message! [client message]
  (let [message-type (oget message "type")
        message-id (oget message "id")]
    (log "dispatch content script message" message-id message-type message)
    (case message-type
      "marion-reset-state" (go-reset-state! message)
      "marion-subscribe-feedback" (go-subscribe-client-to-feedback! message client)
      "marion-unsubscribe-feedback" (go-unsubscribe-client-from-feedback! message client)
      "marion-feedback-from-scenario" (go-broadcast-feedback-from-scenario! message)
      "marion-subscribe-notifications" (go-subscribe-client-to-notifications! message client)
      "marion-unsubscribe-notifications" (go-unsubscribe-client-from-notifications! message client)
      "marion-broadcast-notification" (go-broadcast-notification! message)
      "marion-open-scenario" (go-open-scenario! message)
      "marion-close-scenario" (go-close-scenario! message)
      "marion-activate-scenario" (go-activate-scenario! message)
      "marion-scenario-ready" (go-scenario-ready! message client)
      "marion-switch-to-runner-tab" (go-switch-to-task-runner! message)
      "marion-reposition-runner-window" (go-reposition-runner-window! message)
      "marion-focus-runner-window" (go-focus-runner-window! message)
      "marion-close-all-tabs" (go-close-all-tabs! message)
      "marion-extension-command" (go-handle-extension-command! message))))

; -- content script message loop --------------------------------------------------------------------------------------------

(defn go-run-content-script-message-loop! [client]
  (go
    (log "entering run-message-loop! of" (helpers/get-client-url client))
    (loop []
      (when-some [message (<! client)]
        (<! (go-process-message! client message))
        (recur)))
    (log "leaving run-message-loop! of" (helpers/get-client-url client))))

; -- event handlers ---------------------------------------------------------------------------------------------------------

(defn go-handle-new-connection! [client]
  (go
    (clients/add-client! client)
    (<! (go-run-content-script-message-loop! client))
    (clients/remove-client! client)))
