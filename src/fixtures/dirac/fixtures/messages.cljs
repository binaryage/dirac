(ns dirac.fixtures.messages
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]))

; for communication between tested page and marionette extension
; see https://developer.chrome.com/extensions/content_scripts#host-page-communication
(defn post-message! [message]
  (.postMessage js/window message "*"))

(defn post-extension-command! [command]
  (post-message! #js {:type "marion-extension-command" :payload (pr-str command)}))

(defn fire-chrome-event! [event]
  (post-extension-command! {:command      :fire-synthetic-chrome-event
                            :chrome-event event}))

(defn reset-connection-id-counter! []
  (post-extension-command! {:command :reset-connection-id-counter}))

(defn set-option! [key value]
  (post-extension-command! {:command :set-option
                            :key     key
                            :value   value}))

(defn automate-dirac-frontend! [connection-id action]
  (post-extension-command! {:command       :automate-dirac-frontend
                            :connection-id connection-id
                            :action        action}))

(defn switch-to-task-runner-tab! []
  (post-message! #js {:type "marion-switch-to-task-runner-tab"}))

(defn focus-task-runner-window! []
  (post-message! #js {:type "marion-focus-task-runner-window"}))

(defn close-all-marion-tabs! []
  (post-message! #js {:type "marion-close-all-tabs"}))