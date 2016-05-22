(ns dirac.automation
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [cljs.reader :as reader]
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

(defn wait-for-elements-panel-switch []
  (wait-for-match "setCurrentPanel: elements"))

(defn wait-for-devtools-boot []
  (go
    (<! (wait-for-devtools-ready))
    (<! (wait-for-elements-panel-switch))))                                                                                   ; because we have reset all devtools settings, the first landed panel will be "elements"

(defn wait-for-prompt-to-enter-edit-mode [devtools-id]
  (wait-for-devtools-match devtools-id "setDiracPromptMode('edit')"))

(defn wait-for-console-initialization [devtools-id]
  (wait-for-devtools-match devtools-id "console initialized"))

(defn ^:without-devtools-id set-option! [key value]
  (messages/set-option! key value))

(defn ^:without-devtools-id open-tab-with-scenario! [name]
  (messages/post-message! #js {:type "marion-open-tab-with-scenario" :url (helpers/get-scenario-url name)}))

(defn switch-devtools-panel! [devtools-id panel]
  (automate-dirac-frontend! devtools-id {:action :switch-inspector-panel :panel panel}))

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
    (let [state-representation (<! (get-suggest-box-representation devtools-id))
          data (or (oget state-representation "data") "?")]
      (assert (string? data))
      (println (reader/read-string data)))))

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

(defn switch-to-console! [devtools-id]
  (switch-devtools-panel! devtools-id :console))

(defn ^:without-devtools-id open-devtools! []
  (go
    (let [wait-for-boot (wait-for-devtools-boot)
          reply (<! (fire-chrome-event! [:chromex.ext.commands/on-command ["open-dirac-devtools" {:reset-settings 1}]]))]
      (<! wait-for-boot)
      (let [devtools-id (utils/parse-int (oget reply "data"))]
        (set! *last-devtools-id* devtools-id)
        (DevToolsID. devtools-id)))))                                                                                         ; note: we wrap it so we can easily detect devtools-id parameters in action! method

(defn close-devtools! [devtools-id]
  (go
    (let [wait-for-unregistration (wait-for-devtools-unregistration devtools-id)]
      (<! (fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" devtools-id]]))
      (<! wait-for-unregistration))))

; -- transcript sugar -------------------------------------------------------------------------------------------------------

(defn append-to-transcript! [message & [devtools-id]]
  (let [label (str "automate" (if devtools-id (str " #" devtools-id)))
        message (if (string? message) message (pr-str message))
        style "opacity:0.5;border-top: 1px dashed rgba(0,0,0,0.1);color:#666;margin-top:5px;padding-top:2px;"]
    (transcript/append-to-transcript! label message style)))

; -- flexible automation api ------------------------------------------------------------------------------------------------

(defn make-action-signature [metadata & [args]]
  (str (:name metadata) (if-not (empty? args) (str " " (vec args)))))

(defn action! [action-fn metadata & args]
  (cond
    (:without-devtools-id metadata) (do
                                      (append-to-transcript! (make-action-signature metadata args))
                                      (apply action-fn args))
    (instance? DevToolsID (first args)) (let [devtools-id (first args)]
                                          (append-to-transcript! (make-action-signature metadata (rest args)) devtools-id)
                                          (apply action-fn (:id (first args)) (rest args)))
    :else (do
            (assert *last-devtools-id* (str "action " (:name metadata) " requires prior :open-dirac-devtools call"))
            (append-to-transcript! (make-action-signature metadata args) *last-devtools-id*)
            (apply action-fn *last-devtools-id* args))))