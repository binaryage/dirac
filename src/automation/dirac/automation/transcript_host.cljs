(ns dirac.automation.transcript-host
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.settings :refer [get-test-dirac-agent-port get-transcript-match-timeout
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

(defn append-to-transcript! [label text & [force?]]
  {:pre [(has-transcript?)
         (string? text)
         (string? label)]}
  (when (or *transcript-enabled* force?)
    (put! recorder [label text])
    (transcript/append-to-transcript! @current-transcript (format-transcript label text))))

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