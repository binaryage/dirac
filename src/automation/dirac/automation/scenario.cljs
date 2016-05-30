(ns dirac.automation.scenario
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error]]
            [dirac.automation.messages :as messages]
            [dirac.automation.notifications :as notifications]
            [dirac.automation.helpers :as helpers]))

(defonce triggers (atom {}))                                                                                                  ; trigger-name -> callback

; -- triggers ---------------------------------------------------------------------------------------------------------------

(defn register-trigger! [name callback]
  (swap! triggers assoc name callback)
  (log "registered trigger" name))

(defn unregister-trigger! [name]
  (swap! triggers dissoc name)
  (log "unregistered trigger" name))

(defn call-trigger! [name data]
  (if-let [trigger-fn (get @triggers name)]
    (trigger-fn data)
    (warn "unrecognized trigger " name " when processing " data)))

; -- handling exceptions ----------------------------------------------------------------------------------------------------

(defn scenario-exception-handler! [_message _source _lineno _colno e]
  (messages/post-scenario-feedback! (str "! " (helpers/format-error e)))
  false)

(defn register-global-exception-handler! []
  (oset js/window ["onerror"] scenario-exception-handler!))

; -- notification handler ---------------------------------------------------------------------------------------------------

(defn notification-handler! [notification]
  (if-let [trigger-name (:trigger notification)]
    (call-trigger! trigger-name notification)))

; -- facades ----------------------------------------------------------------------------------------------------------------

(defn ready! []
  (messages/init! "scenario")
  (notifications/init!)
  (register-global-exception-handler!)
  (notifications/subscribe-notifications! notification-handler!)
  (messages/send-scenario-ready!))

(defn feedback! [transcript]
  (messages/post-scenario-feedback! transcript))