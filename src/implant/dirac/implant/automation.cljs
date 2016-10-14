(ns dirac.implant.automation
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [oops.core :refer [oget oset! ocall oapply oset!+ ocall+ oget+ oapply+ gcall+ gset!]]
            [cljs.reader :as reader]
            [dirac.settings :refer-macros [get-automation-entry-point-key]]
            [dirac.utils :as utils]
            [dirac.implant.helpers :refer [get-console-view get-inspector-view get-url-params]]
            [dirac.implant.options :as options]
            [dirac.implant.automation.scrapers :refer [scrape]]))

; -- automation actions -----------------------------------------------------------------------------------------------------

(defn show-inspector-panel! [panel]
  (let [panel-name (name panel)
        inspector-view (get-inspector-view)
        panel-promise (ocall inspector-view "showPanel" panel-name)]
    (if panel-promise
      (ocall panel-promise "then" (fn [_panel] true)))))

(defn get-inspector-current-panel-name []
  (when-let [inspector-view (get-inspector-view)]
    (when-let [panel (ocall inspector-view "currentPanel")]
      (oget panel "name"))))

(defn inspector-drawer-visible? []
  (when-let [inspector-view (get-inspector-view)]
    (ocall inspector-view "drawerVisible")
    true))

(defn show-inspector-drawer! []
  (when-let [inspector-view (get-inspector-view)]
    (if-not (inspector-drawer-visible?)
      (ocall inspector-view "showDrawer"))
    true))

(defn show-view-in-drawer! [view]
  (let [view-name (name view)
        inspector-view (get-inspector-view)]
    (if (ocall inspector-view "drawerVisible")
      (if-not (= (ocall inspector-view "selectedViewInDrawer") view-name)
        (ocall inspector-view "showViewInDrawer" view-name true))))
  true)

(defn open-drawer-console-if-not-on-console-panel! []
  (when-not (= (get-inspector-current-panel-name) "console")
    (show-inspector-drawer!)
    (show-view-in-drawer! :console)
    true))

(defn switch-to-dirac-prompt! []
  (when-let [console-view (get-console-view)]
    (ocall console-view "switchPrompt" "dirac")
    true))

(defn switch-to-js-prompt! []
  (when-let [console-view (get-console-view)]
    (ocall console-view "switchPrompt" "js")
    true))

(defn focus-console-prompt! []
  (when-let [console-view (get-console-view)]
    (ocall console-view "focus")
    true))

(defn focus-best-console-prompt! []
  (open-drawer-console-if-not-on-console-panel!)
  (focus-console-prompt!))

(defn clear-console-prompt! []
  (when-let [console-view (get-console-view)]
    (ocall console-view "_clearPromptBackwards")
    true))

(defn dispatch-console-prompt-input! [input]
  {:pre [(string? input)]}
  (when-let [console-view (get-console-view)]
    (ocall console-view "dispatchEventsForPromptInput" input)))

(defn dispatch-console-prompt-action! [action]
  {:pre [(string? action)]}
  (when-let [console-view (get-console-view)]
    (ocall console-view "dispatchEventsForPromptAction" action)))

(defn enable-console-feedback! []
  (when-let [console-view (get-console-view)]
    (ocall console-view "enableConsoleFeedback")
    true))

(defn disable-console-feedback! []
  (when-let [console-view (get-console-view)]
    (ocall console-view "disableConsoleFeedback")
    true))

(defn get-suggest-box-representation []
  (when-let [console-view (get-console-view)]
    (ocall console-view "getSuggestBoxRepresentation")))

(defn break! []
  (js-debugger)
  true)

(defn get-prompt-representation []
  (when-let [console-view (get-console-view)]
    (ocall console-view "getPromptRepresentation")))

(defn trigger-fn-and-wait! [f delay]
  {:pre [(or (nil? delay) (number? delay))]}
  (if (some? delay)
    (go
      (let [result (f)]
        (<! (timeout delay))
        (if (nil? result)
          (throw "triggered function must not return nil" {:fn    f
                                                           :delay delay})
          result)))
    (f)))

(defn trigger-internal-error! [delay kind]
  {:pre [(or (nil? delay) (number? delay))]}
  (let [fn-name (case kind
                  :unhandled-exception "triggerInternalError"
                  :unhandled-exception-in-promise "triggerInternalErrorInPromise"
                  :error-log "triggerInternalErrorAsErrorLog")
        trigger-fn #(gcall+ ["dirac" fn-name])]
    (trigger-fn-and-wait! trigger-fn delay)))

(defn get-frontend-url-params []
  (get-url-params))

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
    :trigger-internal-error (trigger-internal-error! (:delay command) (:kind command))
    :get-frontend-url-params (get-frontend-url-params)
    :scrape (apply scrape (:scraper command) (:args command))
    (warn "received unknown automation command:" (pr-str command))))

; -- automation -------------------------------------------------------------------------------------------------------------

(defn safe-automate! [command]
  {:pre [(map? command)]}
  (try
    (let [result (dispatch-command! command)]
      (if (nil? result)
        (throw "automation commands must not return nil as an answer, return true/false instead")
        result))
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
  (gset! "!" (get-automation-entry-point-key) automation-handler))

(defn install! []
  (when (options/should-automate?)
    (install-automation-support!)))
