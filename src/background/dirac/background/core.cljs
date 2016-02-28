(ns dirac.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [goog.string :as gstring]
            [goog.string.format]
            [cljs.reader :as reader]
            [cljs.core.async :refer [<! chan put!]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender get-name]]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.windows :as windows]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.browser-action :as browser-action]
            [chromex.ext.commands :as commands]
            [dirac.background.cors :refer [setup-cors-rewriting!]]
            [dirac.target.core :refer [resolve-backend-url]]
            [dirac.background.state :refer [state]]
            [dirac.background.connections :as connections]
            [dirac.options.model :as options]
            [dirac.background.tools :as tools]))

(defonce chrome-event-channel (atom nil))

(defn handle-command! [command]
  (case command
    "open-dirac-devtools" (tools/open-dirac-in-active-tab!)
    (warn "Received unrecognized command:" command)))

(defn on-tab-removed! [tab-id _remove-info]
  (if (connections/dirac-connected? tab-id)
    (connections/unregister-connection! tab-id)))

(defn on-tab-updated! [tab-id _change-info _tab]
  (connections/update-action-button-according-to-connection-state! tab-id))

; -- marion event loop ------------------------------------------------------------------------------------------------------

(defonce marion-port (atom nil))

(defn register-marion! [port]
  (log "BACKGROUND: marion connected" (get-sender port))
  (reset! marion-port port))

(defn unregister-marion! []
  (log "BACKGROUND: marion disconnected")
  (reset! marion-port nil))

(defn process-marion-message [serialized-message]
  {:pre [@chrome-event-channel]}
  (log "got marion message" serialized-message)
  (let [message (reader/read-string serialized-message)]
    (case (:command message)
      :fire-synthetic-chrome-event (put! @chrome-event-channel (:chrome-event message)))))

(defn run-marion-message-loop! [marion-port]
  (go-loop []
    (when-let [message (<! marion-port)]
      (process-marion-message message)
      (recur))
    (unregister-marion!)))

; -- event handlers ---------------------------------------------------------------------------------------------------------

(defn handle-external-client-connection! [client-port]
  (register-marion! client-port)
  (run-marion-message-loop! client-port))

; -- main event loop --------------------------------------------------------------------------------------------------------

(defn process-chrome-event [event-num event]
  (log (gstring/format "BACKGROUND: got chrome event (%05d)" event-num) event)
  (let [[event-id event-args] event]
    (case event-id
      ::browser-action/on-clicked (apply tools/activate-or-open-dirac! event-args)
      ::commands/on-command (apply handle-command! event-args)
      ::tabs/on-removed (apply on-tab-removed! event-args)
      ::tabs/on-updated (apply on-tab-updated! event-args)
      ::runtime/on-connect-external (apply handle-external-client-connection! event-args)
      nil)))

(defn run-chrome-event-loop! [chrome-event-channel]
  (log "BACKGROUND: starting main event loop...")
  (go-loop [event-num 1]
    (when-let [event (<! chrome-event-channel)]
      (process-chrome-event event-num event)
      (recur (inc event-num)))
    (log "BACKGROUND: leaving main event loop")))

(defn boot-chrome-event-loop! []
  (let [channel (make-chrome-event-channel (chan))]
    (reset! chrome-event-channel channel)
    (tabs/tap-all-events channel)
    (runtime/tap-all-events channel)
    (browser-action/tap-on-clicked-events channel)
    (commands/tap-on-command-events channel)
    (run-chrome-event-loop! channel)))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "BACKGROUND: init")
  (setup-cors-rewriting!)
  (go
    (<! (options/init!))
    (boot-chrome-event-loop!)))