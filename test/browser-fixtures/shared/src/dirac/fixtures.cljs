(ns dirac.fixtures
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.fixtures :refer [log info error warn get-launch-transcript-test-key]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [cljs.core.async.impl.protocols :as core-async]
            [dirac.fixtures.transcript :as transcript]
            [dirac.fixtures.status :as status]
            [dirac.fixtures.embedcom :as embedcom]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [cuerdas.core :as cuerdas]
            [dirac.lib.ws-client :as ws-client]
            [devtools.core :as devtools])
  (:import goog.Uri))

(def ^:const SECOND 1000)
(def ^:const MINUTE (* 60 SECOND))
(def ^:const DEFAULT_TRANSCRIPT_MATCH_TIMEOUT (* 5 SECOND))

(defonce current-transcript (atom nil))
(defonce current-status (atom nil))
(defonce last-dirac-frontend-id (atom nil))
(defonce transcript-observers (atom #{}))
(defonce sniffer-enabled (atom true))
(def ^:dynamic *transcript-enabled* true)

(defn add-transcript-observer! [observer]
  (swap! transcript-observers conj observer))

(defn remove-transcript-observer! [observer]
  (swap! transcript-observers disj observer))

(defn init-devtools! []
  (devtools/enable-feature! :dirac :sanity-hints)
  (devtools/install!))

(defn get-body-el []
  (-> js/document (.getElementsByTagName "body") (.item 0)))

(defn get-el-by-id [id]
  (-> js/document (.getElementById id)))

(defn init-transcript! [id]
  (let [transcript-el (transcript/create-transcript! (get-el-by-id id))]
    (reset! current-transcript transcript-el)))

(defn has-transcript? []
  (not (nil? @current-transcript)))

(defn disable-transcript! []
  (set! *transcript-enabled* false))

(defn set-status! [text & [style]]
  (status/set-status! @current-status text)
  (transcript/set-style! @current-transcript style))

(defn init-status! [id]
  (let [status-el (status/create-status! (get-el-by-id id))]
    (reset! current-status status-el)
    (set-status! "ready to run")))

(defn sniffer-enabled? []
  @sniffer-enabled)

(defn disable-sniffer! []
  {:pre [(sniffer-enabled?)]}
  (reset! sniffer-enabled false))

(defn enable-sniffer! []
  {:pre [(not (sniffer-enabled?))]}
  (reset! sniffer-enabled false))

(defn call-transcript-sniffer [text]
  (when-let [dirac-frontend-id (second (re-matches #".*register dirac connection #(.*)" text))]
    (reset! last-dirac-frontend-id dirac-frontend-id))
  (doseq [observer @transcript-observers]
    (observer text)))

(defn append-to-transcript! [text & [force?]]
  {:pre [(has-transcript?)]}
  (if (sniffer-enabled?)
    (call-transcript-sniffer text))
  (if (or *transcript-enabled* force?)
    (transcript/append-to-transcript! @current-transcript (str text "\n"))))

(defn format-transcript-line [type text]
  (let [padded-type (cuerdas/pad type {:length 16 :type :right})]
    (str padded-type " " text)))

(defn read-transcript []
  {:pre [(has-transcript?)]}
  (transcript/read-transcript @current-transcript))

(defn post-marion-command! [event]
  (embedcom/post-page-event! event))

(defn post-with-transcript! [command]
  (append-to-transcript! (format-transcript-line "exec" (pr-str command)))
  (post-marion-command! command))

(defn fire-chrome-event! [event]
  (post-with-transcript! {:command      :fire-synthetic-chrome-event
                          :chrome-event event}))

(defn launch-transcript-test! []
  (log "launching transcript test...")
  (ocall js/window (get-launch-transcript-test-key)))                                                                         ; see go-task

(defn launch-transcript-test-after-delay! [delay-ms]
  (log "test runner scheduled transcript test launch after " delay-ms "ms...")
  (go
    (if (pos? delay-ms)
      (<! (timeout delay-ms)))
    (launch-transcript-test!)))

(defn automate-dirac-frontend! [action]
  {:pre [@last-dirac-frontend-id]}
  (post-with-transcript! {:command       :automate-dirac-frontend
                          :connection-id @last-dirac-frontend-id
                          :action        action}))

(defn process-event! [event]
  (if (= (.-source event) js/window)                                                                                          ; not sure if we need it here
    (if-let [data (.-data event)]
      (case (.-type data)
        "dirac-frontend-feedback-event" (append-to-transcript! (format-transcript-line "dirac frontend" (.-text data)))
        "dirac-extension-feedback-event" (append-to-transcript! (format-transcript-line "dirac extension" (.-text data)))
        "launch-transcript-test" (launch-transcript-test-after-delay! (int (.-delay data)))
        nil))))

(defn init-feedback! []
  (oset js/window ["marionFeedbackPresent"] true)
  (.addEventListener js/window "message" process-event!))

(defn without-transcript-work [worker]
  (binding [*transcript-enabled* false]
    (worker)))

(defn make-uri-object [url]
  (Uri. url))

(defn get-query-param [url param]
  (let [uri (make-uri-object url)]
    (.getParameterValue uri param)))

(defn get-document-url []
  (str (.-location js/document)))

(defn setup-debugging-port! []
  (let [url (get-document-url)]
    (if-let [debugging-port (get-query-param url "debugging_port")]
      (let [target-url (str "http://localhost:" debugging-port)]
        (post-marion-command! {:command :set-option
                               :key     :target-url
                               :value   target-url})))))

(defn is-test-runner-present? []
  (let [url (get-document-url)]
    (boolean (get-query-param url "test_runner"))))

(defn setup! []
  (init-devtools!)
  ; transcript is a fancy name for "log of interesting events"
  (init-transcript! "transcript-box")
  (init-status! "status-box")
  ; feedback subsystem is responsible for intercepting messages to be presented in transcript
  (init-feedback!)
  ; when launched from test runner, chrome driver is in charge of selecting debugging port, we have to propagate this
  ; information to our dirac extension settings
  (setup-debugging-port!)
  ; open-as window is handy for debugging, becasue we can open internal devtools to inspect dirac frontend in case of errors
  (post-marion-command! {:command :set-option
                         :key     :open-as
                         :value   "window"})
  ; if test runner is present, we will wait for test runner to launch the test
  ; it needs to disconnect the driver first
  (if-not (is-test-runner-present?)
    (launch-transcript-test!)))

(defn reset-connection-id-counter! []
  (post-marion-command! {:command :reset-connection-id-counter}))

(defn task-started! []
  (set-status! "task running..." "running")
  (reset-connection-id-counter!))

(defn task-finished!
  ([]
    ; under manual test development we don't want to execute tear-down
    ; - closing existing tabs would interfere with our ability to inspect test results
    ; also we don't want to signal "task finished", because  there is no test runner listening
   (task-finished! (is-test-runner-present?)))
  ([tear-down?]
   (disable-transcript!)
   (set-status! "task finished" "finished")
   (when tear-down?
     (post-marion-command! {:command :tear-down})                                                                             ; to fight https://bugs.chromium.org/p/chromium/issues/detail?id=355075
     (ws-client/connect! "ws://localhost:22555" {:name "Signaller"}))))                                                       ; this signals to the task runner that he can reconnect chrome driver and check the results

(defn wait-for-transcript-match
  ([re]
   (wait-for-transcript-match re nil))
  ([re time-limit]
   (wait-for-transcript-match re time-limit false))
  ([re time-limit silent?]
   (let [channel (chan)
         observer (fn [self text]
                    (when-let [match (re-matches re text)]
                      (remove-transcript-observer! self)
                      (put! channel match)
                      (close! channel)))]
     (add-transcript-observer! (partial observer observer))
     (go
       (<! (timeout (or time-limit DEFAULT_TRANSCRIPT_MATCH_TIMEOUT)))
       (when-not (core-async/closed? channel)
         (if silent?
           (do
             (put! channel :timeout)
             (close! channel))
           (do
             (disable-sniffer!)
             (append-to-transcript! (format-transcript-line "timeout" (str "while waiting for transcript match: " re)))
             (task-finished!)
             (set-status! "task timeouted" "timeout")))))
     channel)))
