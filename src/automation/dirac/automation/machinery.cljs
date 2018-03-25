(ns dirac.automation.machinery
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close! go go-loop]]
            [oops.core :refer [oget oset! ocall oapply]]
            [dirac.automation.logging :refer [log error]]
            [dirac.automation.runner :as runner]
            [dirac.automation.transcript-host :as transcript]
            [dirac.automation.test :as test]
            [clojure.string :as string]))

; -- current scenario tracker -----------------------------------------------------------------------------------------------

(def ^:dynamic *current-scenario-id* nil)

(defn get-current-scenario-id []
  *current-scenario-id*)

; -- devtools id wrapper ----------------------------------------------------------------------------------------------------

(deftype DevToolsID [id])

(defn is-devtools-id-wrapper? [v]
  (instance? DevToolsID v))

(defn get-id [devtools-id-wrapper]
  {:pre (is-devtools-id-wrapper? devtools-id-wrapper)}
  (.-id devtools-id-wrapper))

(defn make-devtools-id-wrapper [id]
  (DevToolsID. id))

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

(defn name-from-metadata [metadata]
  (when-some [action-name (:name metadata)]
    (string/replace (str action-name) #"^go-" "")))                                                                           ; remove go- prefixes by convention

(defn make-action-signature [metadata & [args]]
  (str (name-from-metadata metadata) (if-not (empty? args) (str " " (vec args)))))

(defn do-action! [action-fn metadata & args]
  {:pre [(fn? action-fn)]}
  (let [name (name-from-metadata metadata)
        automation-action? (nil? (re-find #"^wait-" name))]
    (log "action!" automation-action? name args)
    (if automation-action?
      (do
        (test/record-action-execution!)
        (transcript/reset-output-segment!))
      (test/record-transcript-checkpoint!))
    (cond
      (is-devtools-id-wrapper? (first args))
      (let [devtools-id (get-id (first args))
            action-signature (make-action-signature metadata (rest args))]
        (when automation-action?
          (append-to-transcript! action-signature devtools-id))
        (apply action-fn devtools-id (rest args)))

      (:devtools metadata)
      (let [action-signature (make-action-signature metadata args)
            last-devtools-id (get-last-devtools-id)]
        (assert last-devtools-id (str "action " name " requires prior :open-dirac-devtools call"))
        (when automation-action?
          (append-to-transcript! action-signature last-devtools-id))
        (apply action-fn last-devtools-id args))

      :else
      (let [action-signature (make-action-signature metadata args)]
        (when automation-action?
          (append-to-transcript! action-signature))
        (apply action-fn args)))))

; -- macros support ---------------------------------------------------------------------------------------------------------

(defn go-action! [& args]
  (go
    (<! (runner/go-wait-for-resume-if-paused!))
    ; this timeout is important for run-output-matching-loop! and other async operations
    ; without this we could starve those loops and their reaction could be delayed
    (<! (timeout 0))
    (<! (apply do-action! args))))

(defn start-testing! [title]
  (transcript/append-to-transcript! "" "")
  (transcript/append-to-transcript! "testing" title))

(defn end-testing! [_title]
  (transcript/append-to-transcript! "∎" ""))
