(ns dirac.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan put!]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender get-name]]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.windows :as windows]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.browser-action :as browser-action]
            [chromex.ext.commands :as commands]
            [dirac.background.cors :refer [setup-cors-rewriting!]]
            [dirac.target.core :refer [resolve-backend-url]]
            [dirac.background.state :as state]
            [dirac.background.connections :as connections]
            [dirac.options.model :as options]
            [dirac.background.tools :as tools]
            [dirac.background.marion :as marion]))

(defn handle-command! [command & args]
  (log "handling command" command args)
  (marion/post-feedback-event! (str "handling command: " command))
  (case command
    "open-dirac-devtools" (apply tools/open-dirac-in-active-tab! args)
    "close-dirac-devtools" (apply tools/close-dirac-connection! args)
    (warn "received unrecognized command:" command)))

(defn on-tab-removed! [tab-id _remove-info]
  (if (connections/dirac-connected? tab-id)
    (connections/unregister-connection! tab-id)))

(defn on-tab-updated! [tab-id _change-info _tab]
  (connections/update-action-button-according-to-connection-state! tab-id))

; -- event handlers ---------------------------------------------------------------------------------------------------------

(defn handle-external-client-connection! [client-port]
  (case (get-name client-port)
    "Dirac Marionettist" (marion/handle-marion-client-connection! client-port)
    (warn "external connection attempt from unrecognized client" client-port)))

; -- main event loop --------------------------------------------------------------------------------------------------------

(defn process-chrome-event [event]
  (log "got chrome event" event)
  (let [[event-id event-args] event]
    (case event-id
      ::browser-action/on-clicked (apply tools/activate-or-open-dirac! event-args)
      ::commands/on-command (apply handle-command! event-args)
      ::tabs/on-removed (apply on-tab-removed! event-args)
      ::tabs/on-updated (apply on-tab-updated! event-args)
      ::runtime/on-connect-external (apply handle-external-client-connection! event-args)
      nil)))

(defn run-chrome-event-loop! [chrome-event-channel]
  (log "starting main event loop...")
  (go-loop []
    (when-let [event (<! chrome-event-channel)]
      (process-chrome-event event)
      (recur))
    (log "leaving main event loop")))

(defn boot-chrome-event-loop! []
  (let [channel (make-chrome-event-channel (chan))]
    (state/set-chrome-event-channel! channel)
    (tabs/tap-all-events channel)
    (runtime/tap-all-events channel)
    (browser-action/tap-on-clicked-events channel)
    (commands/tap-on-command-events channel)
    (run-chrome-event-loop! channel)))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init")
  (setup-cors-rewriting!)
  (go
    (<! (options/init!))
    (boot-chrome-event-loop!)))