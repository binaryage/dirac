(ns dirac.background.chrome
  (:require [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.ext.browser-action :as browser-action]
            [chromex.ext.commands :as commands]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.windows :as windows]
            [chromex.protocols.chrome-port :as chrome-port]
            [dirac.background.devtools :as devtools]
            [dirac.background.logging :refer [error info log warn]]
            [dirac.background.marion :as marion]
            [dirac.background.state :as state]
            [dirac.background.tools :as tools]
            [dirac.shared.async :refer [<! go go-channel put!]]
            [oops.core :refer [oapply ocall oget oset!]]))

(declare go-process-chrome-event!)

; -- event handlers ---------------------------------------------------------------------------------------------------------

(defn go-handle-command! [command & args]
  (log "handling command" command args)
  (marion/post-feedback-event! (str "handling command: " command))
  (case command
    "open-dirac-devtools" (apply tools/go-open-dirac-devtools-in-active-tab! args)
    "close-dirac-devtools" (apply tools/go-close-dirac-devtools! args)
    "focus-best-console-prompt" (apply tools/go-focus-best-console-prompt! args)
    (go
      (warn "received unrecognized command:" command))))

(defn go-handle-on-tab-removed! [tab-id _remove-info]
  (go
    (when (devtools/frontend-connected? tab-id)
      (devtools/unregister! tab-id))))

(defn go-handle-on-tab-updated! [tab-id _change-info _tab]
  (go
    (devtools/go-update-action-button! tab-id)))

(defn go-handle-external-client-connection! [client-port]
  (go
    (case (chrome-port/get-name client-port)
      "Dirac Marionettist" (let [context {:chrome-event-handler go-process-chrome-event!}]
                             (marion/go-handle-marion-client-connection! context client-port))
      (warn "external connection attempt from unrecognized client" client-port))))

; -- main event loop --------------------------------------------------------------------------------------------------------

(defn go-process-chrome-event! [event]
  (log "dispatch chrome event" event)
  (let [[event-id event-args] event]
    (case event-id
      ::browser-action/on-clicked (apply tools/go-activate-or-open-dirac-devtools! event-args)
      ::commands/on-command (apply go-handle-command! event-args)
      ::tabs/on-removed (apply go-handle-on-tab-removed! event-args)
      ::tabs/on-updated (apply go-handle-on-tab-updated! event-args)
      ::runtime/on-connect-external (apply go-handle-external-client-connection! event-args)
      (go))))

(defn go-run-chrome-event-loop! [chrome-event-channel]
  (go
    (log "starting main event loop...")
    (loop []
      (when-some [event (<! chrome-event-channel)]
        (<! (go-process-chrome-event! event))
        (recur)))
    (log "leaving main event loop")))

(defn go-init-and-run-chrome-event-loop! []
  (let [channel (make-chrome-event-channel (go-channel))]
    (state/set-chrome-event-channel! channel)
    (tabs/tap-all-events channel)
    (runtime/tap-all-events channel)
    (windows/tap-all-events channel)
    (browser-action/tap-on-clicked-events channel)
    (commands/tap-on-command-events channel)
    (go-run-chrome-event-loop! channel)))
