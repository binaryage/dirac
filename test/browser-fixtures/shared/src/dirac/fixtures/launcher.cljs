(ns dirac.fixtures.launcher
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.test.settings :refer [get-launch-transcript-task-key get-launch-transcript-task-message]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.fixtures.messages :as messages]))

(defn register-transcript-task! [task-fn]
  (oset js/window [(get-launch-transcript-task-key)] task-fn))

(defn launch-transcript-task! []
  (log "launching transcript test...")
  (ocall js/window (get-launch-transcript-task-key)))                                                                         ; see go-task

(defn launch-transcript-task-after-delay! [delay-ms]
  (log "test runner scheduled transcript test launch after " delay-ms "ms...")
  (go
    (if (pos? delay-ms)
      (<! (timeout delay-ms)))
    (launch-transcript-task!)))

(defn process-event! [event]
  (if-let [data (oget event "data")]
    (if (= (oget data "type") (get-launch-transcript-task-message))
      (launch-transcript-task-after-delay! (int (oget data "delay"))))))

(defn init! []
  (.addEventListener js/window "message" process-event!))