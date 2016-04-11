(ns dirac.automation
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [dirac.automation.messages :as messages]
            [dirac.automation.task :as task]
            [dirac.automation.transcript-host :as transcript-host]))

(def label "automate")

(defn append-to-transcript! [message & [devtools-id]]
  (transcript-host/append-to-transcript! (if devtools-id (str label " #" devtools-id) label)
                                         (if (string? message) message (pr-str message))))

(defn automate-dirac-frontend! [devtools-id data]
  (append-to-transcript! (pr-str data) devtools-id)
  (messages/automate-dirac-frontend! devtools-id data))

(defn fire-chrome-event! [data]
  (append-to-transcript! data)
  (messages/fire-chrome-event! data))

(defn wait-for-transcript-match [& args]
  (apply transcript-host/wait-for-transcript-match args))

(defn wait-for-dirac-frontend-initialization []
  (wait-for-transcript-match #".*register dirac frontend #(.*)"))

(defn wait-for-implant-initialization []
  (wait-for-transcript-match #".*implant initialized.*"))

(defn wait-for-devtools-ready []
  (wait-for-transcript-match #".*DevTools ready.*"))

(defn wait-for-devtools []
  ; TODO: to be 100% correct we should check for matching devtools id here
  ;       imagine a situation when two or more devtools instances are started at the same time
  (go
    (<! (wait-for-dirac-frontend-initialization))
    (<! (wait-for-implant-initialization))
    (<! (wait-for-devtools-ready))))

(defn wait-for-prompt-edit []
  (wait-for-transcript-match #".*setDiracPromptMode\('edit'\).*"))

(defn wait-for-console-initialization [& [timeout silent?]]
  (wait-for-transcript-match #".*console initialized.*" timeout silent?))

; -- scenarios --------------------------------------------------------------------------------------------------------------

(defn get-base-url []
  (str (oget js/location "protocol") "//" (oget js/location "host")))

(defn get-scenario-url [name]
  (str (get-base-url) "/scenarios/" name ".html"))

(defn open-tab-with-scenario! [name]
  (append-to-transcript! (str "open-tab-with-scenario! " name))
  (messages/post-message! #js {:type "marion-open-tab-with-scenario" :url (get-scenario-url name)}))

; -- automation commands ----------------------------------------------------------------------------------------------------

(defn switch-inspector-panel! [devtools-id panel]
  (automate-dirac-frontend! devtools-id {:action :switch-inspector-panel
                                         :panel  panel}))

(defn switch-to-dirac-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :switch-to-dirac-prompt}))

(defn switch-to-js-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :switch-to-js-prompt}))

(defn focus-console-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :focus-console-prompt}))

(defn clear-console-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :clear-console-prompt}))

(defn dispatch-console-prompt-input! [devtools-id input]
  {:pre [(string? input)]}
  (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-input
                                         :input  input}))

(defn dispatch-console-prompt-action! [devtools-id action]
  {:pre [(string? action)]}
  (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-action
                                         :input  action}))

(defn enable-console-feedback! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :enable-console-feedback}))

(defn disable-console-feedback! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :disable-console-feedback}))

(defn wait-switch-to-console [devtools-id]
  (go
    (switch-inspector-panel! devtools-id :console)
    (<! (wait-for-console-initialization))))

; -- devtools ---------------------------------------------------------------------------------------------------------------

(defn post-open-dirac-devtools-request! []
  ; :reset-settings is important, becasue we want to always start with clear/deterministic devtools for reproducibility
  (fire-chrome-event! [:chromex.ext.commands/on-command ["open-dirac-devtools" {:reset-settings 1}]]))

(defn open-dirac-devtools! []
  (go
    (let [waiting-for-devtools-to-get-ready (wait-for-devtools)
          devtools-id (<! (post-open-dirac-devtools-request!))]
      (<! waiting-for-devtools-to-get-ready)
      devtools-id)))

(defn close-dirac-devtools! [devtools-id]
  (fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" devtools-id]]))