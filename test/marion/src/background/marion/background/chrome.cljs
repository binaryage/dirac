(ns marion.background.chrome
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [marion.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan timeout]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.ext.runtime :as runtime]
            [marion.background.content-script :as content-script]))

; -- chrome event loop ------------------------------------------------------------------------------------------------------

(defn process-event! [event]
  (log "dispatch chrome event" event)
  (let [[event-id event-args] event]
    (case event-id
      ::runtime/on-connect (apply content-script/handle-new-connection! event-args)                                           ; a connection from content script
      nil)))

(defn run-event-loop! [chrome-event-channel]
  (log "starting chrome event loop...")
  (go-loop []
    (when-let [event (<! chrome-event-channel)]
      (process-event! event)
      (recur))
    (log "leaving chrome event loop")))

; -- entrance ---------------------------------------------------------------------------------------------------------------

(defn start-event-loop! []
  (let [chrome-event-channel (make-chrome-event-channel (chan))]
    (runtime/tap-all-events chrome-event-channel)
    (run-event-loop! chrome-event-channel)))
