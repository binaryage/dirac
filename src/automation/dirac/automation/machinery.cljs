(ns dirac.automation.machinery
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log error]]
            [dirac.automation.runner :as runner]
            [dirac.automation.task :as task]
            [dirac.automation.transcript-host :as transcript]
            [dirac.automation.test :as test]))

; -- current scenario tracker -----------------------------------------------------------------------------------------------

(def ^:dynamic *current-scenario-id* nil)

(defn get-current-scenario-id []
  *current-scenario-id*)

; -- devtools id wrapper ----------------------------------------------------------------------------------------------------

(deftype DevToolsID [id])

(defn get-id [devtools-id-wrapper]
  {:pre (instance? DevToolsID devtools-id-wrapper)}
  (.-id devtools-id-wrapper))

; -- devtools id stack ------------------------------------------------------------------------------------------------------

(def ^:dynamic devtools-ids-stack (atom []))                                                                                  ; contains raw id numbers, not DevToolsID wrappers

(defn get-last-devtools-id []
  {:post [(or (number? %) (nil? %))]}
  (last @devtools-ids-stack))

(defn remove-devtools-id-from-stack! [id]
  {:pre [(number? id)]}
  (swap! devtools-ids-stack (fn [stack]
                              (vec (remove #{id} stack))))
  true)

(defn push-devtools-id-to-stack! [id]
  {:pre [(number? id)]}
  (swap! devtools-ids-stack conj id))

(defn pop-devtools-id-from-stack! []
  {:post [(or (number? %) (nil? %))]}
  (let [top-item (volatile! nil)]
    (swap! devtools-ids-stack (fn [stack]
                                (vreset! top-item (last stack))
                                (vec (butlast stack))))
    @top-item))

; -- transcript formatting --------------------------------------------------------------------------------------------------

(def action-style (str "font-weight: bold;"
                       "margin-top:5px;"
                       "padding-top:2px;"
                       "color:#f66;"))

(defn append-to-transcript! [message & [devtools-id]]
  (let [label (str "automate" (if devtools-id (str " #" devtools-id)))
        message (if (string? message) message (pr-str message))]
    (transcript/append-to-transcript! label message action-style)))

; -- actions ----------------------------------------------------------------------------------------------------------------

(defn make-action-signature [metadata & [args]]
  (str (:name metadata) (if-not (empty? args) (str " " (vec args)))))

(defn do-action! [action-fn metadata & args]
  {:pre [(fn? action-fn)]}
  (let [name (str (:name metadata))
        automation-action? (nil? (re-find #"^wait-" name))]
    (log "action!" automation-action? name args)
    (if automation-action?
      (do
        (test/record-action-execution!)
        (transcript/reset-output-segment!))
      (test/record-transcript-checkpoint!))
    (cond
      (instance? DevToolsID (first args)) (let [devtools-id (get-id (first args))
                                                action-signature (make-action-signature metadata (rest args))]
                                            (if automation-action?
                                              (append-to-transcript! action-signature devtools-id))
                                            (apply action-fn devtools-id (rest args)))
      (:devtools metadata) (let [action-signature (make-action-signature metadata args)
                                 last-devtools-id (get-last-devtools-id)]
                             (assert last-devtools-id (str "action " name " requires prior :open-dirac-devtools call"))
                             (if automation-action?
                               (append-to-transcript! action-signature last-devtools-id))
                             (apply action-fn last-devtools-id args))
      :else (let [action-signature (make-action-signature metadata args)]
              (if automation-action?
                (append-to-transcript! action-signature))
              (apply action-fn args)))))

; -- macros support ---------------------------------------------------------------------------------------------------------

(defn action! [& args]
  (go
    (<! (runner/wait-for-resume-if-paused!))
    ; this timeout is important for run-output-matching-loop! and other async operations
    ; without this we could starve those loops and their reaction could be delayed
    (<! (timeout 0))
    (<! (apply do-action! args))))

(defn testing-start [title]
  (transcript/append-to-transcript! "" "")
  (transcript/append-to-transcript! "testing" title))

(defn testing-end [_title]
  (transcript/append-to-transcript! "∎" ""))
