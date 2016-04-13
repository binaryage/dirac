(ns dirac.automation
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log]]
            [dirac.automation.messages :as messages]
            [dirac.automation.task :as task]
            [dirac.automation.transcript-host :as transcript]))

(def label "automate")

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

(defn wait-for-re-match [re & args]
  (apply transcript/wait-for-match (make-re-matcher re) (str "regex: " re) args))

(defn wait-for-substr-match [s & args]
  (apply transcript/wait-for-match (make-substr-matcher s) (str "substr: '" s "'") args))

(defn wait-for-devtools-re-match
  ([re] (assert false))
  ([devtools-id re & args]
   (let [matcher (make-and-matcher (make-devtools-matcher devtools-id) (make-re-matcher re))]
     (apply transcript/wait-for-match matcher (str "devtools #" devtools-id ", regex: " re) args))))

(defn wait-for-devtools-substr-match
  ([s] (assert false))
  ([devtools-id s & args]
   (let [matcher (make-and-matcher (make-devtools-matcher devtools-id) (make-substr-matcher s))]
     (apply transcript/wait-for-match matcher (str "devtools #" devtools-id ", substr: " s) args))))

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
  (wait-for-substr-match "register devtools #"))

(defn wait-for-devtools-unregistration [devtools-id]
  (wait-for-substr-match (str "unregister devtools #" devtools-id)))

(defn wait-for-implant-initialization []
  (wait-for-substr-match "implant initialized"))

(defn wait-for-devtools-ready []
  (wait-for-substr-match "devtools ready"))

(defn wait-for-devtools []
  ; TODO: to be 100% correct we should check for matching devtools id here
  ;       imagine a situation when two or more devtools instances are started at the same time
  (go
    (<! (wait-for-devtools-registration))
    (<! (wait-for-implant-initialization))
    (<! (wait-for-devtools-ready))))

(defn wait-for-devtools-close
  ([] (assert false))
  ([devtools-id]
   (wait-for-devtools-unregistration devtools-id)))

(defn wait-for-prompt-edit
  ([] (assert false))
  ([devtools-id]
   (wait-for-devtools-substr-match devtools-id "setDiracPromptMode('edit')")))

(defn wait-for-console-initialization
  ([] (assert false))
  ([devtools-id]
   (wait-for-devtools-substr-match devtools-id "console initialized")))

; -- scenarios --------------------------------------------------------------------------------------------------------------

(defn get-base-url []
  (str (oget js/location "protocol") "//" (oget js/location "host")))

(defn get-scenario-url [name]
  (str (get-base-url) "/scenarios/" name ".html"))

(defn open-tab-with-scenario! [name]
  (append-to-transcript! (str "open-tab-with-scenario! " name))
  (messages/post-message! #js {:type "marion-open-tab-with-scenario" :url (get-scenario-url name)}))

; -- automation commands ----------------------------------------------------------------------------------------------------

(defn switch-inspector-panel!
  ([] (assert false))
  ([devtools-id panel]
   (automate-dirac-frontend! devtools-id {:action :switch-inspector-panel
                                          :panel  panel})))

(defn switch-to-dirac-prompt!
  ([] (assert false))
  ([devtools-id]
   (automate-dirac-frontend! devtools-id {:action :switch-to-dirac-prompt})))

(defn switch-to-js-prompt!
  ([] (assert false))
  ([devtools-id]
   (automate-dirac-frontend! devtools-id {:action :switch-to-js-prompt})))

(defn focus-console-prompt!
  ([] (assert false))
  ([devtools-id]
   (automate-dirac-frontend! devtools-id {:action :focus-console-prompt})))

(defn clear-console-prompt!
  ([] (assert false))
  ([devtools-id]
   (automate-dirac-frontend! devtools-id {:action :clear-console-prompt})))

(defn dispatch-console-prompt-input!
  ([input] (assert false))
  ([devtools-id input]
   {:pre [(string? input)]}
   (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-input
                                          :input  input})))

(defn dispatch-console-prompt-action!
  ([action] (assert false))
  ([devtools-id action]
   {:pre [(string? action)]}
   (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-action
                                          :input  action})))

(defn console-enter!
  ([input] (assert false))
  ([devtools-id input]
   (go
     (<! (dispatch-console-prompt-input! devtools-id input))
     (<! (dispatch-console-prompt-action! devtools-id "enter")))))

(defn console-enter-and-wait!
  ([input match-or-matches] (assert false))
  ([devtools-id input match-or-matches]
   (let [matches (if (coll? match-or-matches)
                   match-or-matches
                   [match-or-matches])]
     (go
       (<! (console-enter! devtools-id input))
       (doseq [match matches]
         (<! (wait-for-devtools-substr-match devtools-id match)))))))

(defn enable-console-feedback!
  ([] (assert false))
  ([devtools-id]
   (automate-dirac-frontend! devtools-id {:action :enable-console-feedback})))

(defn disable-console-feedback!
  ([] (assert false))
  ([devtools-id]
   (automate-dirac-frontend! devtools-id {:action :disable-console-feedback})))

(defn wait-switch-to-console
  ([] (assert false))
  ([devtools-id]
   (go
     (let [wait (wait-for-console-initialization devtools-id)]
       (<! (switch-inspector-panel! devtools-id :console))
       (<! wait)))))

; -- devtools ---------------------------------------------------------------------------------------------------------------

(defn post-open-dirac-devtools-request! []
  ; :reset-settings is important, becasue we want to always start with clear/deterministic devtools for reproducibility
  (fire-chrome-event! [:chromex.ext.commands/on-command ["open-dirac-devtools" {:reset-settings 1}]]))

(defn open-dirac-devtools! []
  (go
    (let [waiting-for-devtools-to-get-ready (wait-for-devtools)
          reply (<! (post-open-dirac-devtools-request!))]
      (<! waiting-for-devtools-to-get-ready)
      (int (oget reply "data")))))

(defn close-dirac-devtools!
  ([] (assert false))
  ([devtools-id]
   (fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" devtools-id]])))