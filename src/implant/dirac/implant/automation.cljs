(ns dirac.implant.automation
  (:require [chromex.logging :refer-macros [log warn error group group-end]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [cljs.reader :as reader]
            [dirac.settings :refer-macros [get-automation-entry-point-key]]
            [dirac.utils :as utils]
            [dirac.implant.helpers :as helpers :refer [get-console-view get-inspector-view]]))

; -- automation actions -----------------------------------------------------------------------------------------------------

(defn show-inspector-panel! [panel]
  (let [panel-name (name panel)
        inspector-view (get-inspector-view)
        panel-promise (ocall inspector-view "showPanel" panel-name)]
    (if panel-promise
      (ocall panel-promise "then" (fn [_panel] true)))))

(defn get-inspector-current-panel-name []
  (let [inspector-view (get-inspector-view)]
    (if-let [panel (ocall inspector-view "currentPanel")]
      (oget panel "name"))))

(defn inspector-drawer-visible? []
  (let [inspector-view (get-inspector-view)]
    (ocall inspector-view "drawerVisible")))

(defn show-inspector-drawer! []
  (let [inspector-view (get-inspector-view)]
    (if-not (inspector-drawer-visible?)
      (ocall inspector-view "showDrawer"))))

(defn show-view-in-drawer! [view]
  (let [view-name (name view)
        inspector-view (get-inspector-view)]
    (if (ocall inspector-view "drawerVisible")
      (if-not (= (ocall inspector-view "selectedViewInDrawer") view-name)
        (do
          (ocall inspector-view "showViewInDrawer" view-name true)
          true)))))

(defn open-drawer-console-if-not-on-console-panel! []
  (when-not (= (get-inspector-current-panel-name) "console")
    (show-inspector-drawer!)
    (show-view-in-drawer! :console)))

(defn switch-to-dirac-prompt! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "switchPrompt" "dirac")))

(defn switch-to-js-prompt! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "switchPrompt" "js")))

(defn focus-console-prompt! []
  (if-let [console-view (get-console-view)]
    (ocall console-view "focus")))

(defn focus-best-console-prompt! []
  (open-drawer-console-if-not-on-console-panel!)
  (focus-console-prompt!))

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

(defn get-suggest-box-representation []
  (if-let [console-view (get-console-view)]
    (ocall console-view "getSuggestBoxRepresentation")))

(defn break! []
  (js-debugger))

(defn get-prompt-representation []
  (if-let [console-view (get-console-view)]
    (ocall console-view "getPromptRepresentation")))

; -- main dispatch ----------------------------------------------------------------------------------------------------------

(defn dispatch-command! [command]
  (log "dispatch automation command" (pr-str command))
  (case (:action command)
    :break (break!)
    :switch-inspector-panel (show-inspector-panel! (:panel command))
    :switch-to-dirac-prompt (switch-to-dirac-prompt!)
    :switch-to-js-prompt (switch-to-js-prompt!)
    :focus-console-prompt (focus-console-prompt!)
    :clear-console-prompt (clear-console-prompt!)
    :focus-best-console-prompt (focus-best-console-prompt!)
    :dispatch-console-prompt-input (dispatch-console-prompt-input! (:input command))
    :dispatch-console-prompt-action (dispatch-console-prompt-action! (:input command))
    :enable-console-feedback (enable-console-feedback!)
    :disable-console-feedback (disable-console-feedback!)
    :get-suggest-box-representation (get-suggest-box-representation)
    :get-prompt-representation (get-prompt-representation)
    (warn "received unknown automation command:" (pr-str command))))

; -- automation -------------------------------------------------------------------------------------------------------------

(defn safe-automate! [command]
  {:pre [(map? command)]}
  (try
    (dispatch-command! command)
    (catch :default e
      (error "failed to dispatch automation command: " (pr-str command) e)
      e)))

; -- installation -----------------------------------------------------------------------------------------------------------

(defn serialize-error [e]
  (pr-str (utils/make-error-struct e)))

(defn safe-serialize [value]
  (if (instance? js/Error value)
    (serialize-error value)
    (try
      (pr-str (utils/make-result-struct value))
      (catch :default e
        (error "dirac.implant.automation: unable to serialize value" e "\n" value)
        (serialize-error e)))))

(defn safe-unserialize [serialized-value]
  (try
    (reader/read-string serialized-value)
    (catch :default e
      (error "dirac.implant.automation: unable to unserialize value" e "\n" serialized-value)
      e)))

(defn make-marshalled-callback [callback]
  (fn [reply]
    (callback (safe-serialize reply))))

; WARNING: here we are crossing boundary between background and implant projects
;          both cljs code-bases are potentially compiled under :advanced mode but resulting in different minification
;          that is why we cannot pass any cljs values across this boundary
;          we have to strictly serialize results on both ends, that is why we use callbacks here and do not pass channels
(defn automation-handler [message callback]
  {:pre [(string? message)
         (fn? callback)]}
  (let [marshalled-callback (make-marshalled-callback callback)]
    (let [command (safe-unserialize message)]
      (if-not (instance? js/Error command)
        (let [result (safe-automate! command)]
          ; result can potentially be promise or core.async channel,
          ; here we use generic code to turn it back to callback
          (utils/to-callback result marshalled-callback))
        (marshalled-callback command)))))

(defn install-automation-support! []
  (oset js/window [(get-automation-entry-point-key)] automation-handler))

(defn install! []
  (when (helpers/should-automate?)
    (install-automation-support!)))