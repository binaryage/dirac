(ns dirac.automation
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log error]]
            [dirac.automation.messages :as messages]
            [dirac.automation.task :as task]
            [dirac.automation.runner :as runner]
            [dirac.automation.transcript-host :as transcript]
            [dirac.automation.helpers :as helpers]
            [cljs.reader :as reader]
            [dirac.utils :as utils]))

(def label "automate")

(def ^:dynamic *last-devtools-id* nil)

(defn ^:without-devtools-id wait-for-resume! []
  (runner/wait-for-resume!))

; -- matchers ---------------------------------------------------------------------------------------------------------------

(defn make-re-matcher [re]
  (fn [[_label text]]
    (re-matches re text)))

(defn make-substr-matcher [s]
  (fn [[_label text]]
    (not= (.indexOf text s) -1)))

(defn make-devtools-matcher [devtools-id]
  (fn [[label _text]]
    (= label (str "devtools #" devtools-id))))

(defn make-and-matcher [& fns]
  (fn [val]
    (every? #(% val) fns)))

; -- wait helpers -----------------------------------------------------------------------------------------------------------

(defn- make-generic-matcher [input]
  (cond
    (string? input) (make-substr-matcher input)
    (regexp? input) (make-re-matcher input)
    :else (throw (ex-info (str "don't know how to make matcher for " input " (" (type input) ")") input))))

(defn- get-generic-matcher-description [input]
  (str input " (" (type input) ")"))

(defn ^:without-devtools-id wait-for-match [what & args]
  (apply transcript/wait-for-match (make-generic-matcher what) (get-generic-matcher-description what) args))

(defn wait-for-devtools-match [devtools-id what & args]
  (let [matcher (make-and-matcher (make-devtools-matcher devtools-id) (make-generic-matcher what))
        description (str "devtools #" devtools-id ", " (get-generic-matcher-description what))]
    (apply transcript/wait-for-match matcher description args)))

; -- transcript -------------------------------------------------------------------------------------------------------------

(defn append-to-transcript! [message & [devtools-id]]
  (transcript/append-to-transcript! (if devtools-id (str label " #" devtools-id) label)
                                    (if (string? message) message (pr-str message))))

(defn automate-dirac-frontend! [devtools-id data]
  (append-to-transcript! (pr-str data) devtools-id)
  (messages/automate-dirac-frontend! devtools-id data))

(defn fire-chrome-event! [data]
  (append-to-transcript! data)
  (messages/fire-chrome-event! data))

(defn wait-for-devtools-registration []
  (wait-for-match "register devtools #"))

(defn wait-for-devtools-unregistration [devtools-id]
  (wait-for-match (str "unregister devtools #" devtools-id)))

(defn wait-for-implant-initialization []
  (wait-for-match "implant initialized"))

(defn wait-for-devtools-ready []
  (wait-for-match "devtools ready"))

(defn wait-for-elements-panel-switch []
  (wait-for-match "setCurrentPanel: elements"))

(defn wait-for-devtools []
  ; TODO: to be 100% correct we should check for matching devtools id here
  ;       imagine a situation when two or more devtools instances are started at the same time
  (go
    (<! (wait-for-devtools-registration))
    (<! (wait-for-implant-initialization))
    (<! (wait-for-devtools-ready))
    (<! (wait-for-elements-panel-switch))))

(defn wait-for-devtools-close [devtools-id]
  (wait-for-devtools-unregistration devtools-id))

(defn wait-for-prompt-to-enter-edit-mode [devtools-id]
  (wait-for-devtools-match devtools-id "setDiracPromptMode('edit')"))

(defn wait-for-console-initialization [devtools-id]
  (wait-for-devtools-match devtools-id "console initialized"))

(defn ^:without-devtools-id set-option! [key value]
  (messages/set-option! key value))

; -- scenarios --------------------------------------------------------------------------------------------------------------

(defn get-base-url []
  (str (oget js/location "protocol") "//" (oget js/location "host")))

(defn get-scenario-url [name]
  (str (get-base-url) "/scenarios/" name ".html?" (helpers/get-encoded-query (helpers/get-document-url))))                    ; we pass all query parameters to scenario page

(defn ^:without-devtools-id open-tab-with-scenario! [name]
  (append-to-transcript! (str "open-tab-with-scenario! " name))
  (messages/post-message! #js {:type "marion-open-tab-with-scenario" :url (get-scenario-url name)}))

; -- automation commands ----------------------------------------------------------------------------------------------------

(defn switch-inspector-panel! [devtools-id panel]
  (automate-dirac-frontend! devtools-id {:action :switch-inspector-panel :panel panel}))

(defn switch-prompt-to-dirac! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :switch-to-dirac-prompt}))

(defn switch-to-js-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :switch-to-js-prompt}))

(defn focus-console-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :focus-console-prompt}))

(defn clear-console-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :clear-console-prompt}))

(defn get-suggest-box-representation [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :get-suggest-box-representation}))

(defn print-suggest-box-state! [devtools-id]
  (go
    (let [rep (<! (get-suggest-box-representation devtools-id))
          data (oget rep "data")]
      (if (string? data)
        (println (reader/read-string data))
        (do
          (error "unexpected get-suggest-box-representation reply" rep)
          (throw "print-suggest-box-representation failed"))))))

(defn add-input-to-console! [devtools-id input]
  {:pre [(string? input)]}
  (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-input
                                         :input  input}))

(defn dispatch-console-prompt-action! [devtools-id action]
  {:pre [(string? action)]}
  (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-action
                                         :input  action}))

(defn console-enter! [devtools-id input]
  (go
    (<! (add-input-to-console! devtools-id input))
    (<! (dispatch-console-prompt-action! devtools-id "enter"))))

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
  (go
    (let [wait (wait-for-console-initialization devtools-id)]
      (<! (switch-inspector-panel! devtools-id :console))
      (<! wait)
      (<! (wait-for-devtools-match devtools-id "ConsoleView constructed")))))

; -- devtools ---------------------------------------------------------------------------------------------------------------

(deftype DevToolsID [id])

(defn ^:without-devtools-id open-dirac-devtools! []
  (go
    (let [waiting-for-devtools-to-get-ready (wait-for-devtools)
          reply (<! (fire-chrome-event! [:chromex.ext.commands/on-command ["open-dirac-devtools" {:reset-settings 1}]]))]
      (<! waiting-for-devtools-to-get-ready)
      (let [devtools-id (utils/parse-int (oget reply "data"))]
        (set! *last-devtools-id* devtools-id)
        (DevToolsID. devtools-id)))))                                                                                         ; note: we wrap it so we can easily detect devtools-id parameters in action! method

(defn close-dirac-devtools! [devtools-id]
  (fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" devtools-id]]))

; -- flexible automation api ------------------------------------------------------------------------------------------------

(defn action! [action-fn metadata & args]
  (if (:without-devtools-id metadata)
    (apply action-fn args)
    (if (instance? DevToolsID (first args))
      (apply action-fn (:id (first args)) (rest args))
      (do
        (assert *last-devtools-id* (str "action " (:name metadata) " requires prior :open-dirac-devtools call"))
        (apply action-fn *last-devtools-id* args)))))