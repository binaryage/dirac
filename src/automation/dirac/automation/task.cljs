(ns dirac.automation.task
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.settings :refer-macros [get-signal-server-url
                                           get-chrome-remote-debugging-port
                                           get-chrome-remote-debugging-host
                                           get-pending-replies-wait-timeout]]
            [dirac.lib.ws-client :as ws-client]
            [dirac.options.model :as options-model]
            [dirac.automation.transcript-host :as transcript-host]
            [dirac.automation.status-host :as status-host]
            [dirac.automation.feedback :as feedback]
            [dirac.automation.messages :as messages]
            [dirac.automation.launcher :as launcher]
            [dirac.automation.helpers :as helpers]))

(defonce setup-done (volatile! false))
(defonce done (volatile! false))

(defn get-url-param [param]
  (let [url (helpers/get-document-url)]
    (helpers/get-query-param url param)))

(defn setup-debugging-port! []
  (go
    (let [debugging-host (or (get-url-param "debugging_host") (get-chrome-remote-debugging-host) "http://localhost")
          debugging-port (or (get-url-param "debugging_port") (get-chrome-remote-debugging-port) "9222")
          target-url (str debugging-host ":" debugging-port)]
      (when-not (= target-url (:target-url options-model/default-options))
        (info "Setting Dirac Extension :target-url option to" target-url)
        (<! (messages/set-option! :target-url target-url))))))

(defn task-setup! [& [config]]
  (when-not @setup-done                                                                                                       ; this is here to support figwheel's hot-reloading
    (vreset! setup-done true)
    ; transcript is a fancy name for "log of interesting events"
    (transcript-host/init-transcript! "transcript-box")
    (status-host/init-status! "status-box")
    (launcher/init!)
    ; if test runner is present, we will wait for test runner to launch the test
    ; it needs to disconnect the driver first
    (if-not (helpers/is-test-runner-present?)
      (launcher/launch-task!))))

(defn browser-state-cleanup! []
  (messages/post-message! #js {:type "marion-close-all-tabs"} :no-timeout)
  (messages/post-extension-command! {:command :tear-down} :no-timeout))                                                       ; to fight https://bugs.chromium.org/p/chromium/issues/detail?id=3550 75

(defn signal-task-finished! []
  ; this signals to the task runner that he can reconnect chrome driver and check the results
  (ws-client/connect! (get-signal-server-url) {:name    "Signaller"
                                               :on-open #(ws-client/close! %)}))

(defn task-teardown!
  ([]
    ; under manual test development we don't want to execute tear-down
    ; - closing existing tabs would interfere with our ability to inspect test results
    ; also we don't want to signal "task finished", because  there is no test runner listening
   (task-teardown! (helpers/is-test-runner-present?)))
  ([runner-present?]
   (assert @done)
   (go
     (messages/tear-down!)
     (<! (messages/wait-for-all-pending-replies-or-timeout! (get-pending-replies-wait-timeout)))
     (transcript-host/disable-transcript!)
     (feedback/done-feedback!)
     (if runner-present?
       (do
         (browser-state-cleanup!)
         (signal-task-finished!))
       (do
         ; this is for convenience when running tests manually
         (messages/switch-to-task-runner-tab!)
         (messages/focus-task-runner-window!))))))

(defn task-finished! []
  (go
    (when-not @done
      (vreset! done true)
      (status-host/set-status! "task finished")
      (transcript-host/set-style! "finished")
      (<! (task-teardown!))
      true)))

(defn task-timeouted! [data]
  (go
    (when-not @done
      (vreset! done ::timeouted)
      (if-let [transcript (:transcript data)]
        (transcript-host/append-to-transcript! "timeout" transcript true))
      (status-host/set-status! (or (:status data) "task timeouted!"))
      (transcript-host/set-style! (or (:style data) "timeout"))
      (<! (task-teardown!))
      true)))

(defn task-thrown-exception! [e]
  (go
    (when-not @done
      (vreset! done ::thrown-exception)
      (status-host/set-status! (str "task has thrown an exception: " e))
      (transcript-host/set-style! "exception")
      (<! (task-teardown!))
      true)))

(defn task-exception-handler [message _source _lineno _colno error]
  (case (ex-message error)
    :task-timeout (task-timeouted! (ex-data error))
    (task-thrown-exception! message))
  false)

(defn register-global-exception-handler! [handler]
  (oset js/window ["onerror"] handler))

(defn task-started! []
  (go
    (register-global-exception-handler! task-exception-handler)
    (status-host/set-status! "task running...")
    (transcript-host/set-style! "running")
    (messages/reset-devtools-id-counter!)
    ; feedback subsystem is responsible for intercepting messages to be presented in transcript
    (feedback/init-feedback!)
    ; when launched from test runner, chrome driver is in charge of selecting debugging port, we have to propagate this
    ; information to our dirac extension settings
    (<! (setup-debugging-port!))
    ; open-as window is handy for debugging, becasue we can open internal devtools to inspect dirac frontend in case of errors
    (<! (messages/set-option! :open-as "window"))))