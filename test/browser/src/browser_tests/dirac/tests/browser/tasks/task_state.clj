(ns dirac.tests.browser.tasks.task-state)

; -- task state -------------------------------------------------------------------------------------------------------------

(defn make-task-state []
  {:task-success                (volatile! nil)
   :client-disconnected-promise (promise)})

(defn set-task-success! [task-state value]
  (vreset! (:task-success task-state) value))

(defn get-task-success [task-state]
  @(:task-success task-state))

(defn get-task-client-disconnected-promise [task-state]
  (:client-disconnected-promise task-state))
