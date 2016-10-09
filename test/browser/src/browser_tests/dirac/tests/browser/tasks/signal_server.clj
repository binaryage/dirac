(ns dirac.tests.browser.tasks.signal-server
  (:require [clojure.tools.logging :as log]
            [dirac.settings :refer [get-default-task-timeout
                                    get-kill-task-timeout
                                    get-signal-server-close-wait-timeout
                                    get-signal-server-host
                                    get-signal-server-port
                                    get-signal-server-max-connection-time]]
            [dirac.lib.ws-server :as ws-server]
            [dirac.tests.browser.tasks.task-state :refer [get-task-client-disconnected-promise get-task-success
                                                          set-task-success!]]
            [dirac.tests.browser.tasks.helpers :refer [format-friendly-timeout pause-unless-ci kill-task!]]))

; -- signal server ----------------------------------------------------------------------------------------------------------

(defn create-signal-server! [task-state]
  {:pre [(some? (get-task-client-disconnected-promise task-state))
         (not (realized? (get-task-client-disconnected-promise task-state)))
         (nil? (get-task-success task-state))]}
  (ws-server/create! {:name              "Signal server"
                      :host              (get-signal-server-host)
                      :port              (get-signal-server-port)
                      :on-message        (fn [_server _client msg]
                                           (log/debug "signal server: got signal message" msg)
                                           (case (:op msg)
                                             :ready nil                                                                       ; ignore
                                             :task-result (set-task-success! task-state (:success msg))
                                             (log/error "signal server: received unrecognized message" msg)))
                      :on-leaving-client (fn [_server _client]
                                           (log/debug (str ":on-leaving-client called => wait a bit for possible pending messages"))
                                           ; :on-leaving-client can be called before all :on-message messages get delivered
                                           ; introduce some delay here
                                           (future
                                             ; this is here to give client some time to disconnect before destroying server
                                             ; devtools would spit "Close received after close" errors in js console
                                             (Thread/sleep (get-signal-server-close-wait-timeout))
                                             (log/debug ":on-leaving-client after signal-server-close-wait-timeout")
                                             (assert (some? (get-task-success task-state)) "client leaving but we didn't receive :task-result")
                                             (deliver (get-task-client-disconnected-promise task-state) true)))}))

(defn wait-for-client-disconnection! [disconnection-promise timeout-ms]
  (assert (some? disconnection-promise))
  (let [friendly-timeout (format-friendly-timeout timeout-ms)]
    (log/debug (str "wait-for-client-disconnection (timeout " friendly-timeout ")."))
    (if-not (= ::timeouted (deref disconnection-promise timeout-ms ::timeouted))
      true
      (do
        (log/error (str "timeouted while waiting for client disconnection from signal server"))
        (pause-unless-ci)
        false))))

(defn wait-for-signal!
  ([signal-server task-state] (wait-for-signal! signal-server
                                                task-state
                                                (get-default-task-timeout)
                                                (get-kill-task-timeout)
                                                (get-signal-server-max-connection-time)))
  ([signal-server task-state normal-timeout-ms kill-timeout-ms client-disconnection-timeout-ms]
   (let [server-url (ws-server/get-url signal-server)
         client-disconnection-promise (get-task-client-disconnected-promise task-state)
         friendly-normal-timeout (format-friendly-timeout normal-timeout-ms)
         friendly-kill-timeout (format-friendly-timeout kill-timeout-ms)]
     (log/info (str "waiting for a task signal at " server-url " (timeout " friendly-normal-timeout ")."))
     (if (= ::ws-server/timeout (ws-server/wait-for-first-client signal-server normal-timeout-ms))
       (do
         (log/error (str "timeouted while waiting for task signal"
                         " => killing the task... (timeout " friendly-kill-timeout ")"))
         (kill-task!)
         ; give the task a second chance to signal...
         (if (= ::ws-server/timeout (ws-server/wait-for-first-client signal-server kill-timeout-ms))
           (log/error (str "client didn't disconnect even after the kill request, something went really wrong.\n"
                           "This likely means that following tasks will fail too because Chrome debugging port might be still\n"
                           "in use by this non-responsive task (if it still has any devtools instances open).\n"
                           "You will likely see 'Unable to resolve backend-url for Dirac DevTools' kind of errors."))
           (do
             (wait-for-client-disconnection! client-disconnection-promise client-disconnection-timeout-ms)
             (log/info (str "client disconnected after task kill => move to next task"))))
         (set-task-success! task-state false))
       (do
         (if-not (wait-for-client-disconnection! client-disconnection-promise client-disconnection-timeout-ms)
           (set-task-success! task-state false))
         (log/info (str "client disconnected => move to next task"))))
     (assert (some? (get-task-success task-state)) "didn't get task-result message from signal client?")
     (when-not (get-task-success task-state)
       (log/error (str "task reported a failure"))
       (pause-unless-ci))
     (ws-server/destroy! signal-server))))
