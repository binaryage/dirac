(ns marion.background.chrome
  (:require [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.ext.runtime :as runtime]
            [dirac.shared.async :refer [<! go go-channel go-wait]]
            [marion.background.content-script :as content-script]
            [marion.background.logging :refer [error info log warn]]
            [oops.core :refer [oapply ocall oget]]))

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
  (let [chrome-event-channel (make-chrome-event-channel (go-channel))]
    (runtime/tap-all-events chrome-event-channel)
    (run-event-loop! chrome-event-channel)))
