(ns marion.content-script.core
  (:require-macros [cljs.core.async.macros :refer [go-loop]]
                   [marion.content-script.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.protocols :refer [post-message!]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.ext.runtime :as runtime]))

; -- a message loop ---------------------------------------------------------------------------------------------------------

(defn relay-message-to-page! [message]
  (.postMessage js/window message "*"))

(defn process-message! [message]
  (let [type (oget message "type")]
    (case type
      "feedback-from-dirac-extension" (relay-message-to-page! message)
      "feedback-from-dirac-frontend" (relay-message-to-page! message)
      (warn "got unknown message type" type message))))

(defn run-message-loop! [message-channel]
  (log "starting message loop...")
  (go-loop []
    (when-let [message (<! message-channel)]
      (process-message! message)
      (recur))
    (log "leaving message loop")))

(defn page-event-handler [background-port page-event]
  (log "received page event" page-event)
  (post-message! background-port page-event))

; see https://developer.chrome.com/extensions/content_scripts#host-page-communication
; forward all marion-* messages to marion's background page
(defn process-dom-message [handler event]
  (if-let [data (oget event "data")]
    (let [type (oget data "type")]
      (if (and (string? type) (re-matches #"^marion-.*" type))
        (handler data)))))

(defn install! [handler]
  (.addEventListener js/window "message" (partial process-dom-message handler)))

(defn connect-to-background-page! []
  (let [background-port (runtime/connect)]
    (install! (partial page-event-handler background-port))
    (run-message-loop! background-port)))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init")
  (connect-to-background-page!))