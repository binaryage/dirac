(ns dirac.automation.transcript-host
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.automation.transcript-host :refer [debug-log]]
                   [dirac.settings :refer [get-transcript-match-timeout
                                           get-transcript-label-padding-length
                                           get-transcript-label-padding-type]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [dirac.automation.transcript :as transcript]
            [oops.core :refer [oget oset! ocall oapply gcall!]]
            [chromex.logging :refer-macros [log warn error info]]
            [cuerdas.core :as cuerdas]
            [dirac.automation.helpers :as helpers]
            [dirac.utils :as utils]
            [clojure.string :as string]))

(defonce current-transcript (atom nil))
(defonce transcript-enabled (volatile! 0))
(defonce normalized-transcript (volatile! true))
(defonce output-recorder (chan 1024))
(defonce output-observers (atom #{}))
(defonce output-segment (atom []))
(defonce rewriting-machine (atom {:state   :default
                                  :context {}}))

; -- messages ---------------------------------------------------------------------------------------------------------------

(defn ^:dynamic get-timeout-transcript-msg [max-waiting-time info]
  (str "while waiting (" (utils/timeout-display max-waiting-time) ") for transcript match <" info ">"))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn has-transcript? []
  (some? @current-transcript))

(defn set-style! [style]
  (transcript/set-style! @current-transcript style))

(defn normalized-transcript? []
  @normalized-transcript)

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

; -- output observing -------------------------------------------------------------------------------------------------------

(declare replay-output-segment!)

(defn reset-output-segment! []
  (doseq [record @output-observers]
    (if-let [channel (:channel record)]
      (close! channel)))
  (reset! output-segment []))

(defn register-observer! [matching-fn & [channel]]
  (let [record {:matching-fn matching-fn
                :channel     channel}]
    (swap! output-observers conj record)
    (replay-output-segment! record)))

(defn unregister-observer-record! [record]
  (swap! output-observers disj record))

(defn match-observer-record! [observer-record value]
  (when-let [match ((:matching-fn observer-record) value)]
    (unregister-observer-record! observer-record)
    (if-let [channel (:channel observer-record)]
      (put! channel match))))

(defn get-output-segment-values []
  @output-segment)

(defn replay-output-segment! [observer-record]
  (doseq [value (get-output-segment-values)]
    (match-observer-record! observer-record value)))

(defn apppend-to-output-segment! [value]
  (swap! output-segment conj value))

; -- rewriting machine ------------------------------------------------------------------------------------------------------

(defn get-rewriting-machine-state []
  (:state @rewriting-machine))

(defn transition-rewriting-machine! [new-state]
  {:pre [(keyword? new-state)]}
  (debug-log (str "REWRITING MACHING STATE " (get-rewriting-machine-state) " -> " new-state))
  (swap! rewriting-machine assoc :state new-state))

(defn get-rewriting-machine-context []
  (:context @rewriting-machine))

(defn update-rewriting-machine-context! [f & args]
  (let [old-context (get-rewriting-machine-context)]
    (apply swap! rewriting-machine update :context f args)
    (debug-log (str "REWRITING MACHING CONTEXT " old-context " -> " (get-rewriting-machine-context)))))

; -- formatting -------------------------------------------------------------------------------------------------------------

(def box-style "padding:2px;margin-left:-2px;margin-top:1px;border-radius:2px;")
(def fail-style (str box-style "color:#fff; background-color: rgba(255,0,0,0.8);"))

(defonce assigned-styles
  (atom {:counter         0
         "stdout"         (str box-style "color:#666; background-color: rgba(0,0,0,0.1);")
         "stderr"         (str box-style "color:#f00; background-color: rgba(255,0,0,0.1);")
         "ns"             (str box-style "color:#000; font-weight: bold; border-bottom: #ccc solid 1px;border-radius:0px;")
         "testing"        (str box-style "color:#000; font-weight: bold; border-bottom: #ccc solid 1px;border-radius:0px;")
         "∎"              (str box-style "color: #ccc;")
         "fail"           fail-style
         "error"          fail-style
         "summary"        (str box-style "color:#fff; background-color: rgba(0,128,0,0.8);")
         "summary (fail)" (str box-style "color:#fff; background-color: rgba(128,0,0,0.8);")}))

; taken from solarized-light theme
(def possible-style-colors
  ["#262626"                                                                                                                  ; black
   "#d33682"                                                                                                                  ; magenta
   "#268bd2"                                                                                                                  ; blue
   "#859900"                                                                                                                  ; green
   "#b58900"                                                                                                                  ; yellow
   "#6c71c4"                                                                                                                  ; violet
   "#2aa198"                                                                                                                  ; cyan
   "#cb4b16"                                                                                                                  ; orange
   "#dc322f"                                                                                                                  ; red
   ])

(def possible-styles (cycle (map #(str "color:" %) possible-style-colors)))

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


(defn determine-style [label _text]
  (or (get @assigned-styles label)
      (let [style-index (:counter @assigned-styles)
            new-style (nth possible-styles style-index)]
        (swap! assigned-styles #(-> %
                                    (assoc label new-style)
                                    (update :counter inc)))
        new-style)))

; -- transcript rewriting ---------------------------------------------------------------------------------------------------

(defn start-rewriting-machine-for-java-trace! [label text]
  (transition-rewriting-machine! :java-trace)
  (update-rewriting-machine-context! assoc :logs :expecting-java-trace)
  [label (str (utils/extract-first-line text) "\n<elided stack trace>")])

(defn process-java-trace-state! [label text]
  (if (re-find #"^DF\.log" text)
    (case (:logs (get-rewriting-machine-context))
      :expecting-java-trace (do
                              (update-rewriting-machine-context! assoc :logs :received-first-log)
                              [label text])
      :received-first-log (do
                            (update-rewriting-machine-context! dissoc :logs)
                            (transition-rewriting-machine! :default)
                            [label "<elided stack trace log>"]))
    [label text]))

(defn replace-dirac-repl-ids [s]
  (string/replace s #"<dirac/.*?>" "<dirac/compiler-id>"))

(defn replace-dirac-repl-files [s]
  (string/replace s #"~repl/.*?\.(cljs|js)" "~repl/<path>"))

(defn replace-rel-url-params [s]
  (string/replace s #"rel=[0-9]+" "rel=***"))

(defn replace-shortened-urls [s]
  (string/replace s #"[0-9]+:[0-9]*" "***"))

(defn replace-gensyms [s]
  (string/replace s #"--\d+" "--*gen-num*"))

(def internal-error-re1 #"Dirac v.*?, Chrome.*?\n")

(defn replace-internal-error [s]
  (-> s
      (string/replace internal-error-re1 "<elided dirac version info line>\n")))

(defn replace-chrome-extension-urls [s]
  (string/replace s #"chrome-extension://.*?/" "chrome-extension://<extension-id>/"))

(defn replace-cljs-line-numbers [s]
  (string/replace s #"\.cljs:\d+" ".cljs:<line>"))

(defn transformer [console-output]
  (-> console-output
      replace-shortened-urls
      replace-rel-url-params
      replace-gensyms
      replace-internal-error
      replace-dirac-repl-ids
      replace-dirac-repl-files
      replace-chrome-extension-urls
      replace-cljs-line-numbers))

(defn process-default-state! [label text]
  (cond
    (re-find #"^JS\.wrn> \[Violation\]" text) nil                                                                             ; completely elide new messages like "JS.wrn> [Violation] Long running JavaScript task took XXms."
    (re-find #"present-server-side-output! java-trace" text) (start-rewriting-machine-for-java-trace! label text)
    :else [label (transformer text)]))                                                                                        ; TODO: make transformer pluggable

(defn rewrite-transcript! [label text]
  (if-not (normalized-transcript?)
    [label text]
    (case (get-rewriting-machine-state)
      :java-trace (process-java-trace-state! label text)
      :default (process-default-state! label text))))

; -- transcript api ---------------------------------------------------------------------------------------------------------

(defn append-to-transcript! [label text & [style force?]]
  {:pre [(has-transcript?)
         (string? label)
         (string? text)]}
  (when (and (or force? (transcript-enabled?)) (some? text))
    (debug-log "TRANSCRIPT" [label text])
    (when-let [[effective-label effective-text] (rewrite-transcript! label text)]
      (if-not (and (= effective-label label) (= effective-text text))
        (debug-log "TRANSCRIPT REWRITE" [effective-label effective-text]))
      (let [text (format-transcript effective-label effective-text)
            generated-style (determine-style effective-label effective-text)
            style (if (some? style)
                    (str generated-style ";" style)
                    generated-style)]
        (transcript/append-to-transcript! @current-transcript text style)
        (helpers/scroll-page-to-bottom!)
        (record-output! [effective-label effective-text])))))

(defn forced-append-to-transcript! [label text & [style]]
  (append-to-transcript! label text style true))

(defn wait-for-match [match-fn matching-info & [time-limit silent?]]
  (let [result-channel (chan)
        max-waiting-time (or time-limit (get-transcript-match-timeout))
        timeout-channel (timeout max-waiting-time)]
    (register-observer! match-fn result-channel)
    ; return a channel yielding results or throwing timeout exception (may yield :timeout if silent?)
    (go
      (let [[result] (alts! [result-channel timeout-channel])]
        (or result
            (if silent?
              :timeout
              (throw (ex-info :task-timeout {:transcript (get-timeout-transcript-msg max-waiting-time matching-info)}))))))))

; -- transcript init --------------------------------------------------------------------------------------------------------

(defn run-output-matching-loop! []
  (go-loop []
    (when-let [value (<! output-recorder)]
      (apppend-to-output-segment! value)
      (doseq [observer-record @output-observers]
        (match-observer-record! observer-record value))
      (recur))))

(defn init-transcript! [id normalized?]
  (let [transcript-el (transcript/create-transcript! (helpers/get-el-by-id id))]
    (reset! current-transcript transcript-el)
    (vreset! normalized-transcript normalized?)
    (run-output-matching-loop!)))

