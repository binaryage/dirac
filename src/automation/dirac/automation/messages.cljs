(ns dirac.automation.messages
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [dirac.settings :refer-macros [get-marion-message-reply-timeout]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error]]))

(defonce last-message-id (volatile! 0))
(defonce reply-subscribers (atom {}))                                                                                         ; message-id -> list of callbacks
(defonce waiting-for-pending-replies? (volatile! false))
(defonce should-tear-down? (volatile! false))

(defn ^:dynamic get-reply-timeout-message [timeout info]
  (str "timeout (" timeout "ms) while waiting for reply. " (pr-str info)))

(defn get-next-message-id! []
  (vswap! last-message-id inc))

(defn subscribe-to-reply! [message-id callback]
  (swap! reply-subscribers update message-id #(if % (conj % callback) [callback])))

(defn get-reply-subscribers [message-id]
  (get @reply-subscribers message-id))

(defn process-reply! [reply-message]
  (let [message-id (oget reply-message "id")
        subscribers (get-reply-subscribers message-id)]
    (assert (number? message-id))
    (doseq [subscriber subscribers]
      (subscriber reply-message))
    (swap! reply-subscribers dissoc message-id)))

(defn wait-for-reply! [message-id reply-timeout info]
  {:pre [(number? message-id)
         (number? reply-timeout)]}
  (if @should-tear-down?
    (error (str "wait-for-reply! requested after tear-down? " message-id ": " (pr-str info))))
  (let [reply-channel (chan)
        timeout-channel (timeout reply-timeout)
        observer (fn [reply-message]
                   (put! reply-channel reply-message))]
    (subscribe-to-reply! message-id observer)
    (go
      (let [[result] (alts! [reply-channel timeout-channel])]
        (or result (throw (ex-info :task-timeout {:transcript (get-reply-timeout-message reply-timeout info)})))))))

(defn wait-for-all-pending-replies! []
  (assert (not @waiting-for-pending-replies?))
  (if (empty? @reply-subscribers)
    (go)
    (let [key ::wait-for-all-pending-replies!
          channel (chan)
          watcher (fn [_ _ _ state]
                    (when (empty? (keys state))
                      (remove-watch reply-subscribers key)
                      (vreset! @waiting-for-pending-replies? false)
                      (close! channel)))]
      (vreset! waiting-for-pending-replies? true)
      (add-watch reply-subscribers key watcher)
      channel)))

(defn wait-for-all-pending-replies-or-timeout! [time]
  (let [wait-channel (wait-for-all-pending-replies!)
        timeout-channel (timeout time)]
    (go
      (let [[_ channel] (alts! [wait-channel timeout-channel])]
        (if (= channel wait-channel)
          true
          (error (str "timeouted (" time "ms) while waiting for remaining pending replies\n"
                      "missing replies: " (pr-str (keys @reply-subscribers)))))))))

(defn tear-down! []
  (vreset! should-tear-down? true))

; for communication between tested page and marionette extension
; see https://developer.chrome.com/extensions/content_scripts#host-page-communication
(defn post-message-with-timeout! [js-message reply-timeout]
  (let [message-id (get-next-message-id!)]
    (oset js-message ["id"] message-id)
    (let [post-message! #(.postMessage js/window js-message "*")]
      (if (or (nil? reply-timeout) (= :no-timeout reply-timeout))
        (post-message!)
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
  (post-message! #js {:type "marion-switch-to-task-runner-tab"}))

(defn focus-task-runner-window! []
  (post-message! #js {:type "marion-focus-task-runner-window"}))