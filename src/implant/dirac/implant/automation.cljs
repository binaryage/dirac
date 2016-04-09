(ns dirac.implant.automation
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.implant.helpers :refer [get-console-view get-inspector-view]]))

; -- commands ---------------------------------------------------------------------------------------------------------------

(defn switch-inspector-panel! [panel]
  (let [panel-name (name panel)
        inspector-view (get-inspector-view)
        promise (ocall inspector-view "panel" panel-name)
        set-current-panel (oget inspector-view "setCurrentPanel")
        bound-set-current-panel (ocall set-current-panel "bind" inspector-view)]
    (ocall promise "then" bound-set-current-panel)))

; -- console panel ----------------------------------------------------------------------------------------------------------
;  following opperations are assuming that console panel is selected (active)
;  you have to first call (switch-inspector-panel! :console)

(defn switch-to-dirac-prompt! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "switchPrompt" "dirac")))

(defn switch-to-js-prompt! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "switchPrompt" "js")))

(defn focus-console-prompt! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "focus")))

(defn clear-console-prompt! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "_clearPromptBackwards")))

(defn dispatch-console-prompt-input! [input]
  {:pre [(string? input)]}
  (if-let [console-view (get-console-view)]
    (ocall console-view "dispatchEventsForPromptInput" input)))

(defn dispatch-console-prompt-action! [action]
  {:pre [(string? action)]}
  (if-let [console-view (get-console-view)]
    (ocall console-view "dispatchEventsForPromptAction" action)))

(defn enable-console-feedback! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "enableConsoleFeedback")))

(defn disable-console-feedback! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "disableConsoleFeedback")))

; -- main dispatch ----------------------------------------------------------------------------------------------------------

(defn dispatch-command! [command]
  (log "dispatch automation command" (pr-str command))
  (case (:action command)
    :switch-inspector-panel (switch-inspector-panel! (:panel command))
    :switch-to-dirac-prompt (switch-to-dirac-prompt!)
    :switch-to-js-prompt (switch-to-js-prompt!)
    :focus-console-prompt (focus-console-prompt!)
    :clear-console-prompt (clear-console-prompt!)
    :dispatch-console-prompt-input (dispatch-console-prompt-input! (:input command))
    :dispatch-console-prompt-action (dispatch-console-prompt-action! (:input command))
    :enable-console-feedback (enable-console-feedback!)
    :disable-console-feedback (disable-console-feedback!)
    (warn "received unknown automation command:" (pr-str command))))
