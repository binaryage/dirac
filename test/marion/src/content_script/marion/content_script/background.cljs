(ns marion.content-script.background
  (:require-macros [devtools.toolbox :refer [envelope]])
  (:require [cljs.core.async :refer [<! chan go timeout alts! close!]]
            [oops.core :refer [oget ocall oapply]]
            [chromex.protocols :refer [post-message! on-disconnect!]]
            [chromex.ext.runtime :as runtime]
            [marion.content-script.logging :refer [log info warn error]]
            [marion.content-script.page :as page]
            [marion.content-script.state :as state]
            [dirac.settings :refer-macros [get-marion-stable-connection-timeout
                                           get-marion-reconnection-attempt-delay]]))

; -- message handlers -------------------------------------------------------------------------------------------------------

(defn relay-message-to-page! [message]
  (page/send-message! message))

; -- message dispatch -------------------------------------------------------------------------------------------------------

(defn process-message! [message]
  (let [type (oget message "?type")]
    (case type
      "feedback-from-extension" (relay-message-to-page! message)
      "feedback-from-devtools" (relay-message-to-page! message)
      "feedback-from-scenario" (relay-message-to-page! message)
      "notification" (relay-message-to-page! message)
      "reply" (relay-message-to-page! message)
      (warn "got unknown message from background page" type message))))

; -- message loop -----------------------------------------------------------------------------------------------------------

(defn go-run-marion-content-script-message-loop! [background-port]
  (go
    (log "starting marion content script message loop...")
    (state/reset-background-port! background-port)
    (state/flush-pending-messages! (fn [message]
                                     (log "posting postponed message to marion's background page" message)
                                     (post-message! background-port message)))
    (loop []
      (when-let [message (<! background-port)]
        (process-message! message)
        (recur)))
    (state/reset-background-port! nil)
    (log "leaving marion content script message loop")))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn announce-background-page-ready! [port]
  (log (str "marion background page ready!"))
  port)

(defn announce-background-page-not-ready! [_port]
  (log (str "marion background page not ready yet"))
  nil)

; when marion background page is busy we might get connect/disconnect events because there is no event loop running
; to respond to ::runtime/on-connect-external, we detect this case here and pretend connection is not available at this stage
(defn go-accept-stable-connection-only! [port]
  (let [timeout-channel (timeout (get-marion-stable-connection-timeout))
        disconnect-channel (chan)]
    (on-disconnect! port #(close! disconnect-channel))
    (go
      (let [[_ channel] (alts! [timeout-channel disconnect-channel])]
        (condp identical? channel
          timeout-channel (announce-background-page-ready! port)
          disconnect-channel (announce-background-page-not-ready! port))))))

(defn go-maintain-robust-connection-with-marion-background-page! []
  (go
    (loop []
      (log "looking for marion background page...")
      (when-some [background-port (<! (go-accept-stable-connection-only! (runtime/connect)))]                                 ; connects to marion's background page
        (<! (go-run-marion-content-script-message-loop! background-port)))
      (<! (timeout (get-marion-reconnection-attempt-delay)))                                                                  ; do not starve this "thread"
      (recur))))

(defn go-connect! []
  (go-maintain-robust-connection-with-marion-background-page!))
