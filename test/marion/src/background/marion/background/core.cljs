(ns marion.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [goog.string :as gstring]
            [goog.string.format]
            [cljs.core.async :refer [<! chan timeout]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.management :as management]))

(defonce clients (atom []))                                                                                                   ; ports of content scripts
(defonce dirac-port (atom nil))
(defonce pending-dirac-messages (atom []))

(defn flush-pending-dirac-messages! [port]
  (let [messages @pending-dirac-messages]
    (when-not (empty? messages)
      (reset! pending-dirac-messages [])
      (log "flushing " (count messages) " pending messages:" messages)
      (doseq [message messages]
        (post-message! port message)))))

(defn register-pending-message! [message]
  (swap! pending-dirac-messages conj message))

(defn register-dirac-port! [new-port]
  (log "register-dirac-port!" new-port)
  (reset! dirac-port new-port)
  (flush-pending-dirac-messages! new-port))

(defn unregister-dirac-port! []
  (log "unregister-dirac-port!")
  (reset! dirac-port nil))

(defn dirac-port-connected? []
  (boolean @dirac-port))

; -- clients manipulation ---------------------------------------------------------------------------------------------------

(defn add-client! [client]
  (log "BACKGROUND: client connected" (get-sender client))
  (swap! clients conj client))

(defn remove-client! [client]
  (log "BACKGROUND: client disconnected" (get-sender client))
  (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
    (swap! clients remove-item client)))

(defn process-client-message [message]
  (log "process-client-message:" message)
  (if-let [port @dirac-port]
    (post-message! port message)
    (do
      (register-pending-message! message)
      (warn "dirac extension is not connected with marion => queing"))))

(defn broadcast-to-all-clients! [message]
  (log "broadcast-to-all-clients!" message)
  (doseq [client @clients]
    (post-message! client message)))

; -- client event loop ------------------------------------------------------------------------------------------------------

(defn run-client-message-loop! [client]
  (go-loop []
    (when-let [message (<! client)]
      (process-client-message message)
      (recur))
    (remove-client! client)))

; -- event handlers ---------------------------------------------------------------------------------------------------------

(defn handle-client-connection! [client]
  (add-client! client)
  (run-client-message-loop! client))

; -- main event loop --------------------------------------------------------------------------------------------------------

(defn process-chrome-event [event-num event]
  (log (gstring/format "BACKGROUND: got chrome event (%05d)" event-num) event)
  (let [[event-id event-args] event]
    (case event-id
      ::runtime/on-connect (apply handle-client-connection! event-args)
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
    (runtime/tap-all-events chrome-event-channel)
    (run-chrome-event-loop! chrome-event-channel)))

; -- dirac event loop -------------------------------------------------------------------------------------------------------

(defn process-dirac-message! [message]
  (log "process-dirac-message!" message)
  (let [type (oget message "type")]
    (case type
      "dirac-extension-feedback-event" (broadcast-to-all-clients! message)
      (warn "received unknown dirac message type:" type, message))))

(defn run-dirac-extension-background-page-message-loop! [dirac-port]
  (register-dirac-port! dirac-port)
  (go-loop []
    (if-let [message (<! dirac-port)]
      (do
        (process-dirac-message! message)
        (recur))
      (unregister-dirac-port!))))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn find-extension [pred]
  (go
    (let [[extension-infos] (<! (management/get-all))
          match? (fn [extension-info]
                   (if (pred extension-info) extension-info))]
      (some match? extension-infos))))

(defn find-extension-by-name [name]
  (find-extension (fn [extension-info]
                    (= (oget extension-info "name") name))))

(defn connect-to-dirac-extension! []
  (go
    (if-let [extension-info (<! (find-extension-by-name "Dirac DevTools"))]
      (let [id (oget extension-info "id")]
        (log "found dirac extension id" id)
        (runtime/connect id #js {:name "Dirac Marionettist"})))))

(defn maintain-robust-connection-with-dirac-extension! []
  (go-loop []
    (<! (timeout 1000))                                                                                                       ; marion should connect after dirac extension boots up
    (if-not (dirac-port-connected?)
      (if-let [port (<! (connect-to-dirac-extension!))]
        (run-dirac-extension-background-page-message-loop! port)
        (error "unable to find dirac extension to instrument")))
    (recur)))

(defn init! []
  (log "BACKGROUND: init")
  (boot-chrome-event-loop!)
  (maintain-robust-connection-with-dirac-extension!))