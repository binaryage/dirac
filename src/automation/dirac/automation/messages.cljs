(ns dirac.automation.messages
  (:require [dirac.shared.async :refer [put! <! go-channel go-wait alts! close! go]]
            [cljs.reader :as reader]
            [clojure.string :as str]
            [oops.core :refer [oget oset! ocall oapply gcall!]]
            [dirac.automation.logging :refer [log info warn error]]
            [dirac.settings :refer [get-marion-message-reply-timeout]]
            [dirac.shared.utils :as utils]))

(defonce last-message-id (volatile! 0))
(defonce message-id-prefix (volatile! ""))
(defonce reply-subscribers (atom {}))                                                                                         ; message-id -> list of [callback info]
(defonce waiting-for-pending-replies? (volatile! false))
(defonce should-tear-down? (volatile! false))
(defonce processing-messages? (volatile! false))

; -- accessors --------------------------------------------------------------------------------------------------------------

(defn is-processing-messages? []
  @processing-messages?)

(defn ^:dynamic get-reply-timeout-msg [timeout info]
  (str "timeout (" (utils/timeout-display timeout) ") while waiting for reply. " info))

(defn ^:dynamic pending-replies-timeout-msg [timeout subscribers]
  (str "timeouted (" (utils/timeout-display timeout) ") while waiting for remaining pending replies\n"
       "missing replies: " (str/join ", " (map (fn [[id [_cb info]]] (str id ": " info)) subscribers))))

(defn get-next-message-id! []
  (str @message-id-prefix ":" (vswap! last-message-id inc)))

(defn subscribe-to-reply! [message-id callback & [info]]
  (swap! reply-subscribers update message-id #(if % (conj % callback) [[callback info]])))

(defn get-reply-subscriber-callbacks [message-id]
  (map first (get @reply-subscribers message-id)))

(defn process-reply! [reply-message]
  (let [message-id (oget reply-message "id")
        serialized-data (oget reply-message "data")
        data (reader/read-string serialized-data)                                                                             ; TODO: try-catch?
        subscribers (get-reply-subscriber-callbacks message-id)
        unsubscribe! #(swap! reply-subscribers dissoc message-id)]
    (assert (some? message-id))
    (case (first data)
      :error (do
               (unsubscribe!)
               (throw (ex-info :serialized-error data)))
      :result (do
                (doseq [subscriber subscribers]
                  (subscriber (second data)))
                ; unsubscribe AFTER calling all subscribers, due to possible wait-for-all-pending-replies! watching
                (unsubscribe!)))))

(defn go-wait-for-reply! [message-id reply-timeout info]
  {:pre [(some? message-id)
         (or (nil? reply-timeout) (number? reply-timeout))]}
  (assert (is-processing-messages?) (str "wait-for-reply! called before messages/init! call? " message-id ": " (pr-str info)))
  (assert (not @should-tear-down?) (str "wait-for-reply! called after messages/done! call? " message-id ": " (pr-str info)))
  (let [reply-channel (go-channel)
        timeout-channel (if (some? reply-timeout)
                          (go-wait reply-timeout)
                          (go-channel))
        observer (fn [reply-message]
                   {:pre [(some? reply-message)]}
                   (put! reply-channel reply-message))]
    (subscribe-to-reply! message-id observer (pr-str info))
    (go
      (let [[result] (alts! [reply-channel timeout-channel])]
        (or result (throw (ex-info :task-timeout {:transcript (get-reply-timeout-msg reply-timeout (pr-str info))})))))))

(defn go-wait-for-all-pending-replies! []
  (assert (not @waiting-for-pending-replies?))
  (if-not (empty? @reply-subscribers)
    (let [watching-key ::wait-for-all-pending-replies!
          channel (go-channel)
          watcher (fn [_ _ _ new-state]
                    (when (empty? new-state)
                      (remove-watch reply-subscribers watching-key)
                      (vreset! waiting-for-pending-replies? false)
                      (close! channel)))]
      (vreset! waiting-for-pending-replies? true)
      (add-watch reply-subscribers watching-key watcher)
      channel)))

(defn go-wait-for-all-pending-replies-or-timeout! [timeout-ms]
  (if-let [wait-channel (go-wait-for-all-pending-replies!)]
    (let [timeout-channel (go-wait timeout-ms)]
      (go
        (let [[_ channel] (alts! [wait-channel timeout-channel])]
          (if (= channel wait-channel)
            true
            (let [error-msg (pending-replies-timeout-msg timeout-ms @reply-subscribers)]
              (error error-msg)
              (throw error-msg))))))
    (go true)))

; for communication between tested page and marionette extension
; see https://developer.chrome.com/extensions/content_scripts#host-page-communication
(defn go-post-message-with-timeout! [js-message reply-timeout]
  {:pre [(some? js-message)
         (or (nil? reply-timeout) (= :no-timeout reply-timeout) (number? reply-timeout))]}
  (let [message-id (get-next-message-id!)]
    (oset! js-message "!id" message-id)
    (let [reply-timeout (if-not (= :no-timeout reply-timeout) reply-timeout)                                                  ; just convert :no-timeout to nil
          reply-channel (go-wait-for-reply! message-id reply-timeout js-message)]
      (gcall! "postMessage" js-message "*")
      reply-channel)))

(defn go-post-message!
  ([js-message]
   (go-post-message! js-message (get-marion-message-reply-timeout)))
  ([js-message reply-timeout]
   (go-post-message-with-timeout! js-message reply-timeout)))

(defn go-post-extension-command! [command & args]
  (apply go-post-message! #js {:type "marion-extension-command"
                            :payload (pr-str command)} args))

(defn go-fire-chrome-event! [event]
  (go-post-extension-command! {:command   :fire-synthetic-chrome-event
                            :chrome-event event}))

(defn go-reset-extension-state! []
  (go-post-extension-command! {:command :reset-state}))

(defn marion-reset-state! []
  (go-post-message! #js {:type "marion-reset-state"}))

(defn go-reset-state! []
  (go
    (<! (go-reset-extension-state!))
    (<! (marion-reset-state!))
    true))

(defn go-set-options! [options]
  (go-post-extension-command! {:command :set-options
                            :options    options}))

(defn go-reset-options! [options]
  (go-post-extension-command! {:command :reset-options
                            :options    options}))

(defn go-get-options! []
  (go-post-extension-command! {:command :get-options}))

(defn go-automate-dirac-frontend! [devtools-id action]
  (go-post-extension-command! {:command  :automate-dirac-frontend
                            :devtools-id devtools-id
                            :action      action}))

(defn go-switch-to-runner-tab! []
  (go-post-message! #js {:type "marion-switch-to-runner-tab"} :no-timeout))

(defn go-focus-runner-window! []
  (go-post-message! #js {:type "marion-focus-runner-window"} :no-timeout))

(defn go-reposition-runner-window! []
  (go-post-message! #js {:type "marion-reposition-runner-window"} :no-timeout))

(defn go-post-scenario-feedback! [text & [label]]
  (go-post-message! #js {:type "marion-feedback-from-scenario"
                      :payload #js {:type       "feedback-from-scenario"
                                    :transcript text
                                    :label      label}} :no-timeout))

(defn go-broadcast-notification! [notification]
  (go-post-message! #js {:type "marion-broadcast-notification"
                      :payload #js {:type         "notification"
                                    :notification notification}} :no-timeout))

(defn go-send-scenario-ready! []
  (go-post-message! #js {:type "marion-scenario-ready"} :no-timeout))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn process-event! [event]
  (when-some [data (oget event "?data")]
    (case (oget data "?type")
      "reply" (process-reply! data)
      nil)))

(defn start-processing-messages! []
  (if (is-processing-messages?)
    (warn "start-processing-messages! called while already started => ignoring this call")
    (do
      (gcall! "addEventListener" "message" process-event!)
      (vreset! processing-messages? true))))

(defn stop-processing-messages! []
  (if-not (is-processing-messages?)
    (warn "stop-processing-messages! called while not yet started => ignoring this call")
    (do
      (gcall! "removeEventListener" "message" process-event!)
      (vreset! processing-messages? false))))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn init! [& [name]]
  (when (some? name)
    (vreset! message-id-prefix name))
  (start-processing-messages!))

(defn done! []
  (vreset! should-tear-down? true)
  (stop-processing-messages!))
