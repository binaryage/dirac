(ns marion.content-script.background
  (:require-macros [cljs.core.async.macros :refer [go-loop]]
                   [marion.content-script.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.protocols :refer [post-message!]]
            [chromex.ext.runtime :as runtime]
            [marion.content-script.page :as page]))

; -- message handlers -------------------------------------------------------------------------------------------------------

(defn relay-message-to-page! [message]
  (page/send-message! message))

; -- message dispatch -------------------------------------------------------------------------------------------------------

(defn process-message! [message]
  (let [type (oget message "type")]
    (log "process background page message" type message)
    (case type
      "feedback-from-dirac-extension" (relay-message-to-page! message)
      "feedback-from-dirac-frontend" (relay-message-to-page! message)
      (warn "got unknown message from background page" type message))))

; -- message loop -----------------------------------------------------------------------------------------------------------

(defn run-message-loop! [message-channel]
  (log "starting marion background page message loop...")
  (go-loop []
    (when-let [message (<! message-channel)]
      (process-message! message)
      (recur))
    (log "leaving marion background page mesage loop")))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn connect! []
  (let [background-port (runtime/connect)]                                                                                    ; connects to marion's background page
    (page/install! background-port)
    (run-message-loop! background-port)))