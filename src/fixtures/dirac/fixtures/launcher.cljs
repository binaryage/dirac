(ns dirac.fixtures.launcher
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.settings :refer [get-launch-task-key get-launch-task-message]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]))

(defn register-task! [task-fn]
  (oset js/window [(get-launch-task-key)] task-fn))

(defn launch-task! []
  (log "launching task...")
  (ocall js/window (get-launch-task-key)))                                                                                    ; see go-task

(defn launch-task-after-delay! [delay-ms]
  (log "scheduled task launch after " delay-ms "ms...")
  (go
    (if (pos? delay-ms)
      (<! (timeout delay-ms)))
    (launch-task!)))

(defn process-event! [event]
  (if-let [data (oget event "data")]
    (if (= (oget data "type") (get-launch-task-message))
      (launch-task-after-delay! (int (oget data "delay"))))))

(defn init! []
  (.addEventListener js/window "message" process-event!))