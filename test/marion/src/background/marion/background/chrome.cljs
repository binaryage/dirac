(ns marion.background.chrome
  (:require [cljs.core.async :refer [<! chan timeout go go-loop]]
            [oops.core :refer [oget ocall oapply]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.ext.runtime :as runtime]
            [marion.background.logging :refer [log info warn error]]
            [marion.background.content-script :as content-script]))

; -- chrome event loop ------------------------------------------------------------------------------------------------------

(defn process-event! [event]
  (log "dispatch chrome event" event)
  (let [[event-id event-args] event]
    (case event-id
      ::runtime/on-connect (apply content-script/go-handle-new-connection! event-args)                                           ; a connection from content script
      nil)))

(defn run-event-loop! [chrome-event-channel]
  (go
    (log "starting chrome event loop...")
    (loop []
      (when-let [event (<! chrome-event-channel)]
        (process-event! event)
        (recur)))
    (log "leaving chrome event loop")))

; -- entrance ---------------------------------------------------------------------------------------------------------------

(defn start-event-loop! []
  (let [chrome-event-channel (make-chrome-event-channel (chan))]
    (runtime/tap-all-events chrome-event-channel)
    (run-event-loop! chrome-event-channel)))
