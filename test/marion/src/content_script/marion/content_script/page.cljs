(ns marion.content-script.page
  (:require-macros [cljs.core.async.macros :refer [go-loop]]
                   [marion.content-script.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.protocols :refer [post-message!]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]))

(defn send-message-to-page! [message]
  (.postMessage js/window message "*"))

(defn page-event-handler [background-port page-event]
  (log "received page event" page-event)
  (post-message! background-port page-event))

; see https://developer.chrome.com/extensions/content_scripts#host-page-communication
; forward all marion-* messages to marion's background page
(defn process-page-message [handler event]
  (if-let [data (oget event "data")]
    (let [type (oget data "type")]
      (if (and (string? type) (re-matches #"^marion-.*" type))
        (handler data)))))

(defn install! [port]
  (.addEventListener js/window "message" (partial process-page-message (partial page-event-handler port))))