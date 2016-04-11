(ns dirac.automation.messages
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [dirac.settings :refer-macros [get-marion-message-reply-time]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error]]
            [cljs.core.async.impl.protocols :as core-async]))

(defonce last-message-id (volatile! 0))
(defonce reply-subscribers (atom {}))                                                                                         ; message-id -> list of callbacks

(defn ^:dynamic get-reply-timeout-message [reply-timeout info]
  (str "timeout (" reply-timeout " ms) while waiting for reply. " (pr-str info)))

(defn get-next-message-id! []
  (vswap! last-message-id inc))

(defn subscribe-to-reply! [message-id callback]
  (swap! reply-subscribers update message-id #(if % (conj % callback) [callback])))

(defn get-reply-subscribers [message-id]
  (get @reply-subscribers message-id))

(defn process-reply! [reply-message]
  (let [message-id (oget reply-message "id")
        _ (assert (number? message-id))
        subscribers (get-reply-subscribers message-id)]
    (doseq [subscriber subscribers]
      (subscriber reply-message))
    (swap! reply-subscribers dissoc message-id)))

(defn wait-for-reply! [message-id reply-timeout info]
  {:pre [(number? message-id)
         (or (nil? reply-timeout) (number? reply-timeout))]}
  (let [reply-channel (chan)
        effective-timeout (or reply-timeout (get-marion-message-reply-time))
        timeout-channel (timeout effective-timeout)
        observer (fn [reply-message]
                   (put! reply-channel reply-message)
                   (close! reply-channel)
                   (close! timeout-channel))]
    (subscribe-to-reply! message-id observer)
    (go
      (<! timeout-channel)
      (when-not (core-async/closed? reply-channel)
        (throw (ex-info :task-timeout {:transcript (get-reply-timeout-message effective-timeout info)}))))
    reply-channel))

; for communication between tested page and marionette extension
; see https://developer.chrome.com/extensions/content_scripts#host-page-communication
(defn post-message! [js-message & [opts]]
  (let [message-id (get-next-message-id!)]
    (oset js-message ["id"] message-id)
    (let [reply-channel (wait-for-reply! message-id (:reply-timeout opts) js-message)]
      (.postMessage js/window js-message "*")
      reply-channel)))

(defn post-extension-command! [command]
  (post-message! #js {:type "marion-extension-command" :payload (pr-str command)}))

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
  (post-extension-command! {:command       :automate-dirac-frontend
                            :devtools-id devtools-id
                            :action        action}))

(defn switch-to-task-runner-tab! []
  (post-message! #js {:type "marion-switch-to-task-runner-tab"}))

(defn focus-task-runner-window! []
  (post-message! #js {:type "marion-focus-task-runner-window"}))

(defn close-all-marion-tabs! []
  (post-message! #js {:type "marion-close-all-tabs"}))