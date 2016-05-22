(ns dirac.automation.transcript-host
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.settings :refer [get-transcript-match-timeout
                                           get-transcript-label-padding-length
                                           get-transcript-label-padding-type]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [dirac.automation.transcript :as transcript]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [cuerdas.core :as cuerdas]
            [dirac.automation.helpers :as helpers]))

(defonce current-transcript (atom nil))
(defonce transcript-enabled (volatile! 0))
(defonce output-recorder (chan 1024))
(defonce active-output-observer (volatile! nil))
(defonce rewriting-machine (atom {}))

; -- messages ---------------------------------------------------------------------------------------------------------------

(defn ^:dynamic get-timeout-transcript-msg [max-waiting-time info]
  (str "while waiting (" max-waiting-time "ms) for transcript match <" info ">"))

(defn ^:dynamic get-observer-clash-msg [active-observer-info new-observer-info]
  (str "only one wait-for-match call can be in-flight > old: " active-observer-info ", new: " new-observer-info))

; -- enable/disable transcript ----------------------------------------------------------------------------------------------

(defn disable-transcript! []
  (vswap! transcript-enabled inc))

(defn enable-transcript! []
  {:post [(not (neg? %))]}
  (vswap! transcript-enabled dec))

(defn transcript-enabled? []
  (zero? @transcript-enabled))

; -- output recording -------------------------------------------------------------------------------------------------------

(defn record-output! [data]
  (put! output-recorder data))

; -- rewriting machine ------------------------------------------------------------------------------------------------------

(defn transition-rewriting-machine! [new-state]
  (if (some? new-state)
    (swap! rewriting-machine assoc :state new-state)
    (swap! rewriting-machine dissoc :state)))

(defn get-rewriting-machine-state []
  (:state @rewriting-machine))

(defn update-rewriting-machine-context! [f & args]
  (apply swap! rewriting-machine update :context f args))

(defn get-rewriting-machine-context []
  (:context @rewriting-machine))

; -- transcript -------------------------------------------------------------------------------------------------------------

(defn init-transcript! [id]
  (let [transcript-el (transcript/create-transcript! (helpers/get-el-by-id id))]
    (reset! current-transcript transcript-el)))

(defn has-transcript? []
  (some? @current-transcript))

(defn set-style! [style]
  (ocall js/window "setRunnerFavicon" style)
  (transcript/set-style! @current-transcript style))

; -- formatting -------------------------------------------------------------------------------------------------------------

; we want to have two columns, label and then padded text (potentionally wrapped on multiple lines)
(defn format-transcript [label text]
  {:pre [(string? text)
         (string? label)]}
  (let [padding-length (get-transcript-label-padding-length)
        truncated-label (cuerdas/prune label padding-length "")
        padded-label (cuerdas/pad truncated-label {:length padding-length
                                                   :type   (get-transcript-label-padding-type)})
        text-block (helpers/prefix-text-block (cuerdas/repeat " " padding-length) text)]
    (str padded-label text-block "\n")))

; -- transcript rewriting ---------------------------------------------------------------------------------------------------

(defn start-rewriting-machine-for-java-trace! [label text]
  (transition-rewriting-machine! ::java-trace)
  (update-rewriting-machine-context! assoc :logs ::expecting-java-trace)
  [label (str (helpers/extract-first-line text) "\n<elided stack trace>")])

(defn step-rewriting-machine-for-java-trace! [label text]
  (if (re-find #"DF\.log" text)
    (case (:logs (get-rewriting-machine-context))
      ::expecting-java-trace (do
                               (update-rewriting-machine-context! assoc :logs ::received-first-log)
                               [label text])
      ::received-first-log (do
                             (update-rewriting-machine-context! dissoc :logs)
                             [label "<elided stack trace log>"]))
    [label text]))

(defn rewrite-transcript! [label text]
  (if-let [state (get-rewriting-machine-state)]
    (case state
      ::java-trace (step-rewriting-machine-for-java-trace! label text))
    (cond
      (re-find #"present-server-side-output! java-trace" text) (start-rewriting-machine-for-java-trace! label text)
      :else [label text])))

; -- transcript api ---------------------------------------------------------------------------------------------------------

(defn append-to-transcript! [label text & [force?]]
  {:pre [(has-transcript?)
         (string? text)
         (string? label)]}
  (when (or (transcript-enabled?) force?)
    (when-let [[effective-label effective-text] (rewrite-transcript! label text)]
      (transcript/append-to-transcript! @current-transcript (format-transcript effective-label effective-text))
      (record-output! [effective-label effective-text]))))

(defn run-output-matching-loop! [match-fn result-channel]
  (go-loop []
    (when-let [value (<! output-recorder)]
      (if-let [match (match-fn value)]
        (do
          (put! result-channel match)
          (vreset! active-output-observer nil))
        (recur)))))

(defn wait-for-match [match-fn matching-info & [time-limit silent?]]
  (let [result-channel (chan)
        max-waiting-time (or time-limit (get-transcript-match-timeout))
        timeout-channel (timeout max-waiting-time)]
    (assert (not @active-output-observer) (get-observer-clash-msg @active-output-observer matching-info))                     ; we do not support parallel waiting for match, only one wait-for-match call can be in-flight
    (vreset! active-output-observer matching-info)
    (run-output-matching-loop! match-fn result-channel)
    ; return a channel yielding results or throwing timeout exception (may yield :timeout if silent?)
    (go
      (let [[result] (alts! [result-channel timeout-channel])]
        (or result
            (if silent?
              :timeout
              (throw (ex-info :task-timeout {:transcript (get-timeout-transcript-msg max-waiting-time matching-info)}))))))))