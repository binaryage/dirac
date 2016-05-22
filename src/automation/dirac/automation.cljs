(ns dirac.automation
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log error]]
            [dirac.utils :as utils]
            [dirac.automation.helpers :as helpers]
            [dirac.automation.messages :as messages]
            [dirac.automation.matchers :as matchers]
            [dirac.automation.runner :as runner]
            [dirac.automation.transcript-host :as transcript]))

(deftype DevToolsID [id])

(def ^:dynamic *last-devtools-id* nil)

; -- automation actions -----------------------------------------------------------------------------------------------------

(defn ^:without-devtools-id wait-for-resume! []
  (runner/wait-for-resume!))

(defn ^:without-devtools-id wait-for-match [what & args]
  (let [matcher (matchers/make-generic-matcher what)
        description (matchers/get-generic-matcher-description what)]
    (apply transcript/wait-for-match matcher description args)))

(defn wait-for-devtools-match [devtools-id what & args]
  (let [matcher (matchers/make-and-matcher (matchers/make-devtools-matcher devtools-id)
                                           (matchers/make-generic-matcher what))
        description (str "devtools #" devtools-id ", " (matchers/get-generic-matcher-description what))]
    (apply transcript/wait-for-match matcher description args)))

(defn fire-chrome-event! ^:without-devtools-id [data]
  (messages/fire-chrome-event! data))

(defn automate-dirac-frontend! [devtools-id data]
  (messages/automate-dirac-frontend! devtools-id data))

(defn wait-for-devtools-unregistration [devtools-id]
  (wait-for-match (str "unregister devtools #" devtools-id)))

(defn wait-for-devtools-ready []
  (wait-for-match "devtools ready"))

(defn wait-for-panel-switch [name]
  (wait-for-match (str "setCurrentPanel: " name)))

(defn wait-for-devtools-boot []
  (go
    (<! (wait-for-devtools-ready))
    (<! (wait-for-panel-switch "elements"))))                                                                                 ; because we have reset all devtools settings, the first landed panel will be "elements"

(defn wait-for-prompt-to-enter-edit-mode [devtools-id]
  (wait-for-devtools-match devtools-id "setDiracPromptMode('edit')"))

(defn wait-for-console-initialization [devtools-id]
  (wait-for-devtools-match devtools-id "console initialized"))

(defn ^:without-devtools-id set-option! [key value]
  (messages/set-option! key value))

(defn ^:without-devtools-id open-tab-with-scenario! [name]
  (messages/post-message! #js {:type "marion-open-tab-with-scenario" :url (helpers/get-scenario-url name)}))

(defn switch-devtools-panel! [devtools-id panel]
  (go
    (<! (automate-dirac-frontend! devtools-id {:action :switch-inspector-panel :panel panel}))
    (<! (wait-for-panel-switch (name panel)))))

(defn switch-prompt-to-dirac! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :switch-to-dirac-prompt}))

(defn switch-prompt-to-javascript! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :switch-to-js-prompt}))

(defn focus-console-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :focus-console-prompt}))

(defn clear-console-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :clear-console-prompt}))

(defn get-suggest-box-representation [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :get-suggest-box-representation}))

(defn print-suggest-box-state! [devtools-id]
  (go
    (let [data (<! (get-suggest-box-representation devtools-id))]
      (assert (string? data))
      (println data))))

(defn get-prompt-representation [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :get-prompt-representation}))

(defn print-prompt-state! [devtools-id]
  (go
    (let [data (<! (get-prompt-representation devtools-id))]
      (assert (string? data))
      (println data))))

(defn simulate-console-input! [devtools-id input]
  {:pre [(string? input)]}
  (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-input
                                         :input  input}))

(defn simulate-console-action! [devtools-id action]
  {:pre [(string? action)]}
  (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-action
                                         :input  action}))

(defn console-enter! [devtools-id input]
  (go
    (<! (clear-console-prompt! devtools-id))
    (<! (simulate-console-input! devtools-id input))
    (<! (simulate-console-action! devtools-id "enter"))))

(defn console-exec-and-match! [devtools-id input match-or-matches]
  (let [matches (if (coll? match-or-matches)
                  match-or-matches
                  [match-or-matches])]
    (go
      (<! (console-enter! devtools-id input))
      (doseq [match matches]
        (<! (wait-for-devtools-match devtools-id match)))
      (<! (wait-for-devtools-match devtools-id "repl eval job ended")))))

(defn enable-console-feedback! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :enable-console-feedback}))

(defn disable-console-feedback! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :disable-console-feedback}))

(defn switch-to-console-panel! [devtools-id]
  (switch-devtools-panel! devtools-id :console))

(defn ^:without-devtools-id open-devtools! []
  (go
    (let [devtools-id (<! (fire-chrome-event! [:chromex.ext.commands/on-command
                                               ["open-dirac-devtools" {:reset-settings 1}]]))]
      (<! (wait-for-devtools-boot))
      (if-not (helpers/is-test-runner-present?)
        (messages/switch-to-task-runner-tab!))                                                                                ; for convenience
      (set! *last-devtools-id* devtools-id)
      (DevToolsID. devtools-id))))                                                                                            ; note: we wrap it so we can easily detect devtools-id parameters in action! method

(defn close-devtools! [devtools-id]
  (go
    (<! (fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" devtools-id]]))
    (<! (wait-for-devtools-unregistration devtools-id))))

; -- transcript sugar -------------------------------------------------------------------------------------------------------

(def action-style (str "font-weight: bold;"
                       "border-top:1px dashed rgba(0,0,0,0.3);"
                       "margin-top:5px;"
                       "padding-top:2px;"
                       "color:#f66;"))

(defn append-to-transcript! [message & [devtools-id]]
  (let [label (str "automate" (if devtools-id (str " #" devtools-id)))
        message (if (string? message) message (pr-str message))]
    (transcript/append-to-transcript! label message action-style)))

; -- flexible automation api ------------------------------------------------------------------------------------------------

(defn make-action-signature [metadata & [args]]
  (str (:name metadata) (if-not (empty? args) (str " " (vec args)))))

(defn action! [action-fn metadata & args]
  (let [name (str (:name metadata))
        new-segment? (nil? (re-find #"^wait-" name))]
    (log "action!" name args)
    (when new-segment?
      (transcript/reset-output-segment!))
    (cond
      (:without-devtools-id metadata) (do
                                        (if new-segment?
                                          (append-to-transcript! (make-action-signature metadata args)))
                                        (apply action-fn args))
      (instance? DevToolsID (first args)) (let [devtools-id (first args)
                                                action-signature (make-action-signature metadata (rest args))]
                                            (if new-segment?
                                              (append-to-transcript! action-signature devtools-id))
                                            (apply action-fn (:id (first args)) (rest args)))
      :else (let [action-signature (make-action-signature metadata args)]
              (assert *last-devtools-id* (str "action " name " requires prior :open-dirac-devtools call"))
              (if new-segment?
                (append-to-transcript! action-signature *last-devtools-id*))
              (apply action-fn *last-devtools-id* args)))))