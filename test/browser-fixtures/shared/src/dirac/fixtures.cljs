(ns dirac.fixtures
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [cljs.core.async.impl.protocols :as core-async]
            [dirac.fixtures.transcript :as transcript]
            [dirac.fixtures.embedcom :as embedcom]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [cuerdas.core :as cuerdas]
            [dirac.lib.ws-client :as ws-client]
            [devtools.core :as devtools])
  (:import goog.Uri))

(def ^:const DEFAULT_TRANSCRIPT_MATCH_TIMEOUT 5000)

(defonce current-transcript (atom nil))
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

(defn append-to-transcript! [text]
  {:pre [(has-transcript?)]}
  (if (sniffer-enabled?)
    (call-transcript-sniffer text))
  (if *transcript-enabled*                                                                                                    ;*transcript-enabled*
    (transcript/append-to-transcript! @current-transcript (str text "\n"))))

(defn format-transcript-line [type text]
  (let [padded-type (cuerdas/pad type {:length 16 :type :right})]
    (str padded-type " " text)))

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
             (append-to-transcript! (format-transcript-line "timeout" (str "while waiting for transcript match: " re)))))))
     channel)))

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

(defn automate-dirac-frontend! [action]
  {:pre [@last-dirac-frontend-id]}
  (post-with-transcript! {:command       :automate-dirac-frontend
                          :connection-id @last-dirac-frontend-id
                          :action        action}))

(defn process-event! [event]
  (if (= (.-source event) js/window)
    (if-let [data (.-data event)]
      (case (.-type data)
        "dirac-frontend-feedback-event" (append-to-transcript! (format-transcript-line "dirac frontend" (.-text data)))
        "dirac-extension-feedback-event" (append-to-transcript! (format-transcript-line "dirac extension" (.-text data)))
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

(defn setup-debugging-port! []
  (let [url (str (.-location js/document))]
    (if-let [debugging-port (get-query-param url "debugging_port")]
      (let [target-url (str "http://localhost:" debugging-port)]
        (post-marion-command! {:command :set-option
                               :key     :target-url
                               :value   target-url})))))

(defn setup! []
  (init-devtools!)
  (init-transcript! "transcript-box")
  (init-feedback!)
  (setup-debugging-port!)
  (post-marion-command! {:command :set-option
                         :key     :open-as
                         :value   "window"}))

(defn task-finished! []
  ; this signals to the task runner that he can reconnect chrome driver and check the results
  (post-marion-command! {:command :tear-down})                                                                                ; to fight https://bugs.chromium.org/p/chromium/issues/detail?id=355075
  (ws-client/connect! "ws://localhost:22555" {:name "Signaller"}))