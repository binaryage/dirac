(ns dirac.automation.messages
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [dirac.settings :refer-macros [get-marion-message-reply-timeout]]
            [dirac.utils :as utils]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error]]
            [cljs.reader :as reader]
            [clojure.string :as str]))

(defonce last-message-id (volatile! 0))
(defonce reply-subscribers (atom {}))                                                                                         ; message-id -> list of [callback info]
(defonce waiting-for-pending-replies? (volatile! false))
(defonce should-tear-down? (volatile! false))

(defn ^:dynamic get-reply-timeout-message [timeout info]
  (str "timeout (" (utils/timeout-display timeout) ") while waiting for reply. " info))

(defn ^:dynamic pending-replies-timeout-msg [timeout subscribers]
  (str "timeouted (" (utils/timeout-display timeout) ") while waiting for remaining pending replies\n"
       "missing replies: " (str/join ", " (map (fn [id [_cb info]] (str id ": " info)) subscribers))))

(defn get-next-message-id! []
  (vswap! last-message-id inc))

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
    (assert (number? message-id))
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
  {:pre [(number? message-id)
         (number? reply-timeout)]}
  (assert (not @should-tear-down?) (str "wait-for-reply! requested after tear-down? " message-id ": " (pr-str info)))
  (let [reply-channel (chan)
        timeout-channel (timeout reply-timeout)
        observer (fn [reply-message]
                   {:pre [(some? reply-message)]}
                   (put! reply-channel reply-message))]
    (subscribe-to-reply! message-id observer (pr-str info))
    (go
      (let [[result] (alts! [reply-channel timeout-channel])]
        (or result (throw (ex-info :task-timeout {:transcript (get-reply-timeout-message reply-timeout (pr-str info))})))))))

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

(defn tear-down! []
  (vreset! should-tear-down? true))

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

(defn reset-devtools-id-counter! []
  (post-extension-command! {:command :reset-devtools-id-counter}))

(defn set-option! [key value]
  (post-extension-command! {:command :set-option
                            :key     key
                            :value   value}))

(defn automate-dirac-frontend! [devtools-id action]
  (post-extension-command! {:command     :automate-dirac-frontend
                            :devtools-id devtools-id
                            :action      action}))

(defn switch-to-task-runner-tab! []
  (post-message! #js {:type "marion-switch-to-task-runner-tab"} :no-timeout))

(defn focus-task-runner-window! []
  (post-message! #js {:type "marion-focus-task-runner-window"} :no-timeout))