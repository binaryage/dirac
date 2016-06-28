(ns dirac.automation.messages
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [cljs.reader :as reader]
            [clojure.string :as str]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error]]
            [dirac.settings :refer-macros [get-marion-message-reply-timeout]]
            [dirac.utils :as utils]))

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

(defn wait-for-reply! [message-id reply-timeout info]
  {:pre [(some? message-id)
         (number? reply-timeout)]}
  (assert (is-processing-messages?) (str "wait-for-reply! called before messages/init! call? " message-id ": " (pr-str info)))
  (assert (not @should-tear-down?) (str "wait-for-reply! called after messages/done! call? " message-id ": " (pr-str info)))
  (let [reply-channel (chan)
        timeout-channel (timeout reply-timeout)
        observer (fn [reply-message]
                   {:pre [(some? reply-message)]}
                   (put! reply-channel reply-message))]
    (subscribe-to-reply! message-id observer (pr-str info))
    (go
      (let [[result] (alts! [reply-channel timeout-channel])]
        (or result (throw (ex-info :task-timeout {:transcript (get-reply-timeout-msg reply-timeout (pr-str info))})))))))

(defn wait-for-all-pending-replies! []
  (assert (not @waiting-for-pending-replies?))
  (if-not (empty? @reply-subscribers)
    (let [watching-key ::wait-for-all-pending-replies!
          channel (chan)
          watcher (fn [_ _ _ new-state]
                    (when (empty? new-state)
                      (remove-watch reply-subscribers watching-key)
                      (vreset! waiting-for-pending-replies? false)
                      (close! channel)))]
      (vreset! waiting-for-pending-replies? true)
      (add-watch reply-subscribers watching-key watcher)
      channel)))

(defn wait-for-all-pending-replies-or-timeout! [timeout-ms]
  (if-let [wait-channel (wait-for-all-pending-replies!)]
    (let [timeout-channel (timeout timeout-ms)]
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
(defn post-message-with-timeout! [js-message reply-timeout]
  (let [message-id (get-next-message-id!)]
    (oset js-message ["id"] message-id)
    (let [post-message! #(.postMessage js/window js-message "*")]
      (if (or (nil? reply-timeout) (= :no-timeout reply-timeout))
        (go
          (post-message!)
          nil)
        (let [reply-channel (wait-for-reply! message-id reply-timeout js-message)]
          (post-message!)
          reply-channel)))))


(defn post-message!
  ([js-message]
   (post-message-with-timeout! js-message (get-marion-message-reply-timeout)))
  ([js-message reply-timeout]
   (post-message-with-timeout! js-message reply-timeout)))

(defn post-extension-command! [command & args]
  (apply post-message! #js {:type "marion-extension-command" :payload (pr-str command)} args))

(defn fire-chrome-event! [event]
  (post-extension-command! {:command      :fire-synthetic-chrome-event
                            :chrome-event event}))

(defn extension-reset-state! []
  (post-extension-command! {:command :reset-state}))

(defn marion-reset-state! []
  (post-message! #js {:type "marion-reset-state"}))

(defn reset-state! []
  (go
    (<! (extension-reset-state!))
    (<! (marion-reset-state!))
    true))

(defn set-options! [options]
  (post-extension-command! {:command :set-options
                            :options options}))

(defn reset-options! [options]
  (post-extension-command! {:command :reset-options
                            :options options}))

(defn get-options! []
  (post-extension-command! {:command :get-options}))

(defn automate-dirac-frontend! [devtools-id action]
  (post-extension-command! {:command     :automate-dirac-frontend
                            :devtools-id devtools-id
                            :action      action}))

(defn switch-to-task-runner-tab! []
  (post-message! #js {:type "marion-switch-to-task-runner-tab"} :no-timeout))

(defn focus-task-runner-window! []
  (post-message! #js {:type "marion-focus-task-runner-window"} :no-timeout))

(defn post-scenario-feedback! [text & [label]]
  (post-message! #js {:type    "marion-feedback-from-scenario"
                      :payload #js {:type       "feedback-from-scenario"
                                    :transcript text
                                    :label      label}} :no-timeout))

(defn broadcast-notification! [notification]
  (post-message! #js {:type    "marion-broadcast-notification"
                      :payload #js {:type         "notification"
                                    :notification notification}} :no-timeout))

(defn send-scenario-ready! []
  (post-message! #js {:type "marion-scenario-ready"} :no-timeout))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn process-event! [event]
  (if-let [data (oget event "data")]
    (case (oget data "type")
      "reply" (process-reply! data)
      nil)))

(defn start-processing-messages! []
  (if (is-processing-messages?)
    (warn "start-processing-messages! called while already started => ignoring this call")
    (do
      (.addEventListener js/window "message" process-event!)
      (vreset! processing-messages? true))))

(defn stop-processing-messages! []
  (if-not (is-processing-messages?)
    (warn "stop-processing-messages! called while not yet started => ignoring this call")
    (do
      (.removeEventListener js/window "message" process-event!)
      (vreset! processing-messages? false))))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn init! [& [name]]
  (if (some? name)
    (vreset! message-id-prefix name))
  (start-processing-messages!))

(defn done! []
  (vreset! should-tear-down? true)
  (stop-processing-messages!))
