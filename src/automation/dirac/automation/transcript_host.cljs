(ns dirac.automation.transcript-host
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.settings :refer [get-browser-tests-dirac-agent-port get-transcript-match-timeout
                                           get-transcript-label-padding-length get-transcript-label-padding-type]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [dirac.automation.transcript :as transcript]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [cuerdas.core :as cuerdas]
            [dirac.automation.helpers :as helpers]))

(defonce current-transcript (atom nil))
(defonce ^:dynamic *transcript-enabled* true)
(defonce recorder (chan 1000))
(defonce active-reader (volatile! false))
(defonce filter-machine-state (atom {}))

(defn ^:dynamic get-timeout-transcript [max-waiting-time info]
  (str "while waiting (" max-waiting-time "ms) for transcript match <" info ">"))

; -- transcript -------------------------------------------------------------------------------------------------------------

(defn init-transcript! [id]
  (let [transcript-el (transcript/create-transcript! (helpers/get-el-by-id id))]
    (reset! current-transcript transcript-el)))

(defn has-transcript? []
  (not (nil? @current-transcript)))

(defn disable-transcript! []
  (set! *transcript-enabled* false))

(defn set-style! [style]
  (ocall js/window "setRunnerFavicon" style)
  (transcript/set-style! @current-transcript style))

(defn format-transcript [label text]
  {:pre [(string? text)
         (string? label)]}
  (let [padding-length (get-transcript-label-padding-length)
        truncated-label (cuerdas/prune label padding-length "")
        padded-label (cuerdas/pad truncated-label {:length padding-length
                                                   :type   (get-transcript-label-padding-type)})
        text-block (helpers/prefix-text-block (cuerdas/repeat " " padding-length) text)]
    (str padded-label text-block "\n")))

(defn extract-first-line [s]
  (-> s
      (cuerdas/lines)
      (first)))

(defn start-state-machine-for-java-trace [label text]
  (swap! filter-machine-state assoc :state :java-trace :logs 2)
  [label (str (extract-first-line text) "\n<elided stack trace>")])

(defn advance-state-machine-for-java-trace [label text]
  (if (re-find #"DF\.log" text)
    (case (:logs @filter-machine-state)
      2 (do
          (swap! filter-machine-state assoc :logs 1)
          [label text])
      1 (do
          (swap! filter-machine-state dissoc :state :logs)
          [label "<elided stack trace log>"]))
    [label text]))

(defn filter-transcript [label text]
  (if-let [state (:state @filter-machine-state)]
    (case state
      :java-trace (advance-state-machine-for-java-trace label text))
    (cond
      (re-find #"present-server-side-output! java-trace" text) (start-state-machine-for-java-trace label text)
      :else [label text])))

(defn append-to-transcript! [label text & [force?]]
  {:pre [(has-transcript?)
         (string? text)
         (string? label)]}
  (when (or *transcript-enabled* force?)
    (when-let [[filtered-label filtered-text] (filter-transcript label text)]
      (put! recorder [filtered-label filtered-text])
      (transcript/append-to-transcript! @current-transcript (format-transcript filtered-label filtered-text)))))

(defn read-transcript []
  {:pre [(has-transcript?)]}
  (transcript/read-transcript @current-transcript))

(defn without-transcript-work [worker]
  (binding [*transcript-enabled* false]
    (worker)))

(defn wait-for-match [match-fn info & [time-limit silent?]]
  (let [result-channel (chan)
        max-waiting-time (or time-limit (get-transcript-match-timeout))
        timeout-channel (timeout max-waiting-time)]
    (assert (not @active-reader) (str "reader clash> old: " @active-reader ", new: " info))
    (vreset! active-reader info)
    (go-loop []
      (when-let [value (<! recorder)]
        (if-let [match (match-fn value)]
          (do
            (put! result-channel match)
            (vreset! active-reader nil))
          (recur))))
    (go
      (let [[result] (alts! [result-channel timeout-channel])]
        (or result
            (if silent?
              :timeout
              (throw (ex-info :task-timeout {:transcript (get-timeout-transcript max-waiting-time info)}))))))))