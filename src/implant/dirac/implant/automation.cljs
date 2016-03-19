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

(defn focus-console-prompt! []
  ; assuming console panel is selected
  (if-let [console-view (get-console-view)]
    (ocall console-view "focus")))

(defn switch-to-dirac-prompt! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "switchPrompt" "dirac")))

(defn switch-to-js-prompt! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "switchPrompt" "js")))

; -- main dispatch ----------------------------------------------------------------------------------------------------------

(defn dispatch-command! [command]
  (log "dispatch automation command" (pr-str command))
  (case (:action command)
    :switch-inspector-panel (switch-inspector-panel! (:panel command))
    :focus-console-prompt (focus-console-prompt!)
    :switch-to-dirac-prompt (switch-to-dirac-prompt!)
    :switch-to-js-prompt (switch-to-js-prompt!)
    (warn "received unknown automation command:" (pr-str command))))
