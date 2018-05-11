(ns dirac.automation.launcher
  (:require [dirac.automation.logging :refer [error info log warn]]
            [dirac.settings :refer [get-kill-task-key get-kill-task-message
                                    get-launch-task-key get-launch-task-message]]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]
            [goog.string :as string]
            [oops.core :refer [gcall! gset! oapply ocall ocall+ oget oset! oset!+]]))

(defn register-task! [task-fn kill-fn]
  (log "registering task...")
  (gset! "!" (get-launch-task-key) task-fn)
  (gset! "!" (get-kill-task-key) kill-fn))

(defn kill-task! []
  (log "killing task... via" (get-kill-task-key))
  (gcall! (get-kill-task-key)))                                                                                               ; see go-task

(defn launch-task! []
  (log "launching task... via" (get-launch-task-key))
  (gcall! (get-launch-task-key)))                                                                                             ; see go-task

(defn go-launch-task-after-delay! [delay-ms]
  (log "scheduled task launch after " delay-ms "ms...")
  (go
    (when (pos? delay-ms)
      (<! (go-wait delay-ms)))
    (launch-task!)))

(defn go-process-event! [event]
  (when-some [data (oget event "?data")]
    (let [type (oget data "?type")
          delay-str (oget data "?delay")
          delay (if (some? delay-str) (string/parseInt delay-str))]
      (cond
        (= type (get-launch-task-message)) (go-launch-task-after-delay! delay)
        (= type (get-kill-task-message)) (go (kill-task!))))))

(defn init! []
  (gcall! "addEventListener" "message" go-process-event!))
