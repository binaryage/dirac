(ns marion.content-script.page
  (:require [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols.chrome-port :as chrome-port]
            [dirac.shared.async :refer [<! go-channel]]
            [marion.content-script.logging :refer [error info log warn]]
            [marion.content-script.state :as state]
            [oops.core :refer [gcall! oapply ocall oget]]))

; this code is responsible for communication between content script and hosting page
; see https://developer.chrome.com/extensions/content_scripts#host-page-communication

; -- send messages to page --------------------------------------------------------------------------------------------------

(defn send-message! [message]
  (gcall! "postMessage" message "*"))

; -- handle incoming messages from page -------------------------------------------------------------------------------------

(defn handle-marion-message! [message]
  (if-some [port (state/get-background-port)]
    (do
      (log "received page message, posting it to marion's background page" message)
      (chrome-port/post-message! port message))
    (do
      (log "received page message, but background page connection is not yet available => postpone" message)
      (state/add-pending-message message))))

(defn marion-message? [message]
  (let [type (oget message "type")]
    (and (string? type) (re-matches #"^marion-.*" type))))

; forward all marion-* messages to marion's background page
(defn process-page-message! [dom-event]
  {:pre [dom-event]}
  (if-let [message (oget dom-event "?data")]
    (if (marion-message? message)
      (handle-marion-message! message))))

; -- installation -----------------------------------------------------------------------------------------------------------

(defn install! []
  (.addEventListener js/window "message" process-page-message!))
