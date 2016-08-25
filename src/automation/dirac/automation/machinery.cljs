(ns dirac.automation.machinery
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log error]]
            [dirac.automation.task :as task]
            [dirac.automation.transcript-host :as transcript]
            [dirac.automation.test :as test]))

(deftype DevToolsID [id])

(def ^:dynamic *last-devtools-id* nil)

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
  (let [name (str (:name metadata))
        automation-action? (nil? (re-find #"^wait-" name))]
    (if (task/frozen?)
      (do
        (log "skipping action!" name " (task is fronzen due to failures)")
        (go))
      (do
        (log "action!" automation-action? name args)
        (if automation-action?
          (do
            (test/record-action-execution!)
            (transcript/reset-output-segment!))
          (test/record-transcript-checkpoint!))
        (cond
          (:without-devtools-id metadata) (do
                                            (if automation-action?
                                              (append-to-transcript! (make-action-signature metadata args)))
                                            (apply action-fn args))
          (instance? DevToolsID (first args)) (let [devtools-id (first args)
                                                    action-signature (make-action-signature metadata (rest args))]
                                                (if automation-action?
                                                  (append-to-transcript! action-signature devtools-id))
                                                (apply action-fn (:id (first args)) (rest args)))
          :else (let [action-signature (make-action-signature metadata args)]
                  (assert *last-devtools-id* (str "action " name " requires prior :open-dirac-devtools call"))
                  (if automation-action?
                    (append-to-transcript! action-signature *last-devtools-id*))
                  (apply action-fn *last-devtools-id* args)))))))

; -- macros support ---------------------------------------------------------------------------------------------------------

(defn action! [& args]
  (go
    ; this timeout is important for run-output-matching-loop! and other async operations
    ; without this we could starve those loops and their reaction could be delayed
    (<! (timeout 0))
    (<! (apply do-action! args))))

(defn testing-start [title]
  (transcript/append-to-transcript! "" "")
  (transcript/append-to-transcript! "testing" title))

(defn testing-end [_title]
  (transcript/append-to-transcript! "∎" ""))
