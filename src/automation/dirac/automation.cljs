(ns dirac.automation
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [dirac.automation.messages :as messages]
            [dirac.automation.transcript-host :as transcript-host]))

(def label "automate")

(defn append-to-transcript! [message & [connection-id]]
  (transcript-host/append-to-transcript! (if connection-id (str label " #" connection-id) label)
                                         (if (string? message) message (pr-str message))))

(defn automate-dirac-frontend! [connection-id data]
  (append-to-transcript! (pr-str data) connection-id)
  (messages/automate-dirac-frontend! connection-id data))

(defn fire-chrome-event! [data]
  (append-to-transcript! data)
  (messages/fire-chrome-event! data))

(defn wait-for-transcript-match [& args]
  (apply transcript-host/wait-for-transcript-match args))

(defn wait-for-dirac-frontend-initialization []
  (wait-for-transcript-match #".*register dirac frontend connection #(.*)"))

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

(defn switch-inspector-panel! [connection-id panel]
  (automate-dirac-frontend! connection-id {:action :switch-inspector-panel
                                           :panel  panel}))

(defn switch-to-dirac-prompt! [connection-id]
  (automate-dirac-frontend! connection-id {:action :switch-to-dirac-prompt}))

(defn switch-to-js-prompt! [connection-id]
  (automate-dirac-frontend! connection-id {:action :switch-to-js-prompt}))

(defn focus-console-prompt! [connection-id]
  (automate-dirac-frontend! connection-id {:action :focus-console-prompt}))

(defn clear-console-prompt! [connection-id]
  (automate-dirac-frontend! connection-id {:action :clear-console-prompt}))

(defn dispatch-console-prompt-input! [connection-id input]
  {:pre [(string? input)]}
  (automate-dirac-frontend! connection-id {:action :dispatch-console-prompt-input
                                           :input  input}))

(defn dispatch-console-prompt-action! [connection-id action]
  {:pre [(string? action)]}
  (automate-dirac-frontend! connection-id {:action :dispatch-console-prompt-action
                                           :input  action}))

(defn enable-console-feedback! [connection-id]
  (automate-dirac-frontend! connection-id {:action :enable-console-feedback}))

(defn disable-console-feedback! [connection-id]
  (automate-dirac-frontend! connection-id {:action :disable-console-feedback}))

(defn wait-switch-to-console [connection-id]
  (go
    (switch-inspector-panel! connection-id :console)
    (<! (wait-for-console-initialization))))

; -- devtools ---------------------------------------------------------------------------------------------------------------

(defn post-open-dirac-devtools-request! []
  ; :reset-settings is important, becasue we want to always start with clear/deterministic devtools for reproducibility
  (fire-chrome-event! [:chromex.ext.commands/on-command ["open-dirac-devtools" {:reset-settings 1}]]))

(defn open-dirac-devtools! []
  (go
    (let [waiting-for-devtools-to-get-ready (wait-for-devtools)
          connection-id (<! (post-open-dirac-devtools-request!))]
      (<! waiting-for-devtools-to-get-ready)
      connection-id)))

(defn close-dirac-devtools! [connection-id]
  (fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" connection-id]]))