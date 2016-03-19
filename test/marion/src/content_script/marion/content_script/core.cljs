(ns marion.content-script.core
  (:require-macros [cljs.core.async.macros :refer [go-loop]])
  (:require [cljs.core.async :refer [<! chan]]
            [marion.content-script.embedcom :as embedcom]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.protocols :refer [post-message!]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.ext.runtime :as runtime]))

; -- a message loop ---------------------------------------------------------------------------------------------------------

(defn relay-message-to-page! [message]
  (.postMessage js/window message "*"))

(defn process-message! [message]
  (let [type (oget message "type")]
    (case type
      "dirac-extension-feedback-event" (relay-message-to-page! message)
      (warn "got unknown message type" type message))))

(defn run-message-loop! [message-channel]
  (log "CONTENT SCRIPT: starting message loop...")
  (go-loop []
    (when-let [message (<! message-channel)]
      (process-message! message)
      (recur))
    (log "CONTENT SCRIPT: leaving message loop")))

(defn page-event-handler [background-port page-event]
  (log "CONTENT SCRIPT: received page event" page-event)
  (post-message! background-port page-event))

(defn connect-to-background-page! []
  (let [background-port (runtime/connect)]
    (embedcom/install! (partial page-event-handler background-port))
    (run-message-loop! background-port)))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "CONTENT SCRIPT: init")
  (connect-to-background-page!))