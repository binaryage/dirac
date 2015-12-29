(ns dirac.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [goog.string :as gstring]
            [goog.string.format]
            [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender]]
            [chromex.ext.windows :as windows]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.browser-action :as browser-action]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.commands :as commands]
            [dirac.background.cors :refer [setup-cors-rewriting!]]
            [dirac.target.core :refer [resolve-backend-url]]
            [dirac.i18n :as i18n]
            [dirac.sugar :as sugar]
            [dirac.background.helpers :as helpers :refer [report-error-in-tab report-warning-in-tab]]
            [dirac.background.state :refer [state]]
            [dirac.background.connections :as connections]
            [dirac.background.action :as action]
            [dirac.options.model :as options]))

(defn update-action-button-according-to-connection-state! [backend-tab-id]
  {:pre [(number? backend-tab-id)]}
  (if (connections/backend-connected? backend-tab-id)
    (action/update-action-button backend-tab-id :connected "Dirac is connected")
    (action/update-action-button backend-tab-id :waiting "Click to open Dirac DevTools")))

(defn register-connection! [dirac-tab-id backend-tab-id]
  {:pre [(number? dirac-tab-id)
         (number? backend-tab-id)]}
  (connections/add! dirac-tab-id backend-tab-id)
  (update-action-button-according-to-connection-state! backend-tab-id))

(defn unregister-connection! [dirac-tab-id]
  {:pre [(number? dirac-tab-id)]}
  (when-let [{:keys [backend-tab-id]} (connections/get-dirac-connection dirac-tab-id)]
    (connections/remove! dirac-tab-id)
    (update-action-button-according-to-connection-state! backend-tab-id)))

(defn create-dirac-window! [url panel?]
  {:pre [url]}
  (go
    (if-let [[window] (<! (windows/create #js {"url"  url
                                               "type" (if panel? "popup" "normal")}))]
      (let [tabs (oget window "tabs")
            first-tab (aget tabs 0)]
        (sugar/get-tab-id first-tab)))))

(defn create-dirac-tab! [url]
  {:pre [url]}
  (go
    (if-let [[tab] (<! (tabs/create #js {"url" url}))]
      (sugar/get-tab-id tab))))

(defn create-dirac! [backend-tab-id url open-as]
  {:pre [backend-tab-id url]}
  (go
    (if-let [dirac-tab-id (<! (if (keyword-identical? open-as :tab)
                                (create-dirac-tab! url)
                                (create-dirac-window! url (keyword-identical? open-as :panel))))]
      (register-connection! dirac-tab-id backend-tab-id)
      (report-error-in-tab backend-tab-id (i18n/unable-to-create-dirac-tab)))))

(defn open-dirac! [tab open-as]
  (let [backend-tab-id (sugar/get-tab-id tab)
        tab-url (oget tab "url")
        target-url (options/get-option :target-url)]
    (assert backend-tab-id)
    (cond
      (not tab-url) (report-error-in-tab backend-tab-id (i18n/tab-cannot-be-debugged tab))
      (not target-url) (report-error-in-tab backend-tab-id (i18n/target-url-not-specified))
      :else (go
              (if-let [backend-url (<! (resolve-backend-url target-url tab-url))]
                (if (keyword-identical? backend-url :not-attachable)
                  (report-warning-in-tab backend-tab-id (i18n/cannot-attach-dirac target-url tab-url))
                  (create-dirac! backend-tab-id (helpers/get-devtools-url backend-url) open-as))
                (report-error-in-tab backend-tab-id (i18n/unable-to-resolve-backend-url target-url tab-url)))))))

(defn activate-dirac! [tab-id]
  (go
    (let [{:keys [dirac-tab-id]} (connections/find-backend-connection tab-id)
          _ (assert dirac-tab-id)
          dirac-window-id (<! (sugar/fetch-tab-window-id dirac-tab-id))]
      (if dirac-window-id
        (windows/update dirac-window-id #js {"focused"       true
                                             "drawAttention" true}))
      (tabs/update dirac-tab-id #js {"active" true}))))

(defn get-dirac-open-as-setting []
  (let [setting (options/get-option :open-as)]
    (case setting
      "window" :window
      "tab" :tab
      :panel)))

(defn activate-or-open-dirac! [tab]
  (let [tab-id (oget tab "id")]
    (if (connections/backend-connected? tab-id)
      (activate-dirac! tab-id)
      (open-dirac! tab (get-dirac-open-as-setting)))))

(defn open-dirac-in-active-tab! []
  (go
    (let [[tabs] (<! (tabs/query #js {"lastFocusedWindow" true
                                      "active"            true}))]
      (if-let [tab (first tabs)]
        (activate-or-open-dirac! tab)
        (warn "No active tab?")))))

(defn handle-command! [command]
  (case command
    "open-dirac-devtools" (open-dirac-in-active-tab!)
    (warn "Received unrecognized command:" command)))

(defn on-tab-removed! [tab-id _remove-info]
  (if (connections/dirac-connected? tab-id)
    (unregister-connection! tab-id)))

(defn on-tab-updated! [tab-id _change-info _tab]
  (update-action-button-according-to-connection-state! tab-id))

; -- main event loop --------------------------------------------------------------------------------------------------------

(defn process-chrome-event [event-num event]
  (log (gstring/format "BACKGROUND: got chrome event (%05d)" event-num) event)
  (let [[event-id event-args] event]
    (case event-id
      ::browser-action/on-clicked (apply activate-or-open-dirac! event-args)
      ::commands/on-command (apply handle-command! event-args)
      ::tabs/on-removed (apply on-tab-removed! event-args)
      ::tabs/on-updated (apply on-tab-updated! event-args)
      nil)))

(defn run-chrome-event-loop! [chrome-event-channel]
  (log "BACKGROUND: starting main event loop...")
  (go-loop [event-num 1]
    (when-let [event (<! chrome-event-channel)]
      (process-chrome-event event-num event)
      (recur (inc event-num)))
    (log "BACKGROUND: leaving main event loop")))

(defn boot-chrome-event-loop! []
  (let [chrome-event-channel (make-chrome-event-channel (chan))]
    (tabs/tap-all-events chrome-event-channel)
    (runtime/tap-all-events chrome-event-channel)
    (browser-action/tap-on-clicked-events chrome-event-channel)
    (commands/tap-on-command-events chrome-event-channel)
    (run-chrome-event-loop! chrome-event-channel)))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "BACKGROUND: init")
  (setup-cors-rewriting!)
  (go
    (<! (options/init!))
    (boot-chrome-event-loop!)))