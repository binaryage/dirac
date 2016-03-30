(ns dirac.fixtures.automation
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [dirac.settings :refer-macros [get-marion-message-reply-time]]
            [dirac.fixtures.messages :as messages]
            [dirac.fixtures.transcript-host :as transcript-host]
            [cljs.core.async.impl.protocols :as core-async]))

(defn wait-for-reply!
  ([message]
   (wait-for-reply! message (get-marion-message-reply-time)))
  ([message time]
   (let [message-id (oget message "id")
         _ (assert (number? message-id))
         channel (chan)
         interceptor (fn [reply]
                       (put! channel reply)
                       (close! channel))]
     (messages/subscribe-to-reply! message-id interceptor)
     (when time
       (assert (number? time))
       (go
         (<! (timeout time))
         (when-not (core-async/closed? channel)
           (throw (ex-info :task-timeout {:transcript (str "timeout while waiting for reply to " (pr-str message))})))))
     channel)))

(def label "automate")

(defn append-to-transcript! [message & [connection-id]]
  (transcript-host/append-to-transcript! (if connection-id (str label " #" connection-id) label)
                                         (if (string? message) message (pr-str message))))

(defn automate-dirac-frontend! [connection-id data]
  (append-to-transcript! (pr-str data) connection-id)
  (wait-for-reply!
    (messages/automate-dirac-frontend! connection-id data)))

(defn fire-chrome-event! [data]
  (append-to-transcript! data)
  (wait-for-reply!
    (messages/fire-chrome-event! data)))

; -- automation commands ----------------------------------------------------------------------------------------------------

(defn get-base-url []
  (str (oget js/location "protocol") "//" (oget js/location "host")))

(defn get-scenario-url [name]
  (str (get-base-url) "/scenarios/" name ".html"))

(defn open-tab-with-scenario! [name]
  (append-to-transcript! (str "open-tab-with-scenario! " name))
  (wait-for-reply!
    (messages/post-message! #js {:type "marion-open-tab-with-scenario" :url (get-scenario-url name)})))

(defn open-dirac-devtools! []
  (fire-chrome-event! [:chromex.ext.commands/on-command ["open-dirac-devtools" {:reset-settings 1}]]))                        ; we want to always start with clear devtools for reproducibility

(defn close-dirac-devtools! [connection-id]
  (fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" connection-id]]))

(defn switch-inspector-panel! [connection-id panel]
  (go
    (<! (timeout 300))                                                                                                        ; TODO: remove
    (automate-dirac-frontend! connection-id {:action :switch-inspector-panel
                                             :panel  panel})))

(defn focus-console-prompt! [connection-id]
  (automate-dirac-frontend! connection-id {:action :focus-console-prompt}))

(defn switch-to-dirac-prompt! [connection-id]
  (automate-dirac-frontend! connection-id {:action :switch-to-dirac-prompt}))

(defn switch-to-js-prompt! [connection-id]
  (automate-dirac-frontend! connection-id {:action :switch-to-js-prompt}))

; -- waiting for transcript feedback ----------------------------------------------------------------------------------------

(defn wait-for-transcript-match [& args]
  (apply transcript-host/wait-for-transcript-match args))

(defn wait-for-dirac-frontend-initialization []
  (wait-for-transcript-match #".*register dirac frontend connection #(.*)"))

(defn wait-for-implant-initialization []
  (wait-for-transcript-match #".*implant initialized.*"))

(defn wait-for-console-initialization [& [timeout silent?]]
  (wait-for-transcript-match #".*console initialized.*" timeout silent?))

(defn wait-switch-to-console [connection-id]
  (go
    (switch-inspector-panel! connection-id :console)
    (<! (wait-for-console-initialization))))
