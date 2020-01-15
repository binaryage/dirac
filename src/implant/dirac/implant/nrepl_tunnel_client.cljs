(ns dirac.implant.nrepl-tunnel-client
  (:require [cljs-uuid-utils.core :as uuid]
            [dirac.implant.console :as console]
            [dirac.implant.eval :as eval]
            [dirac.implant.logging :refer [error info log warn]]
            [dirac.implant.version :as implant-version]
            [dirac.shared.ws-client :as ws-client]
            [dirac.shared.async :refer [<! close! go go-channel go-wait put!]]))

(defonce wannabe-client (atom nil))
(defonce current-client (atom nil))                                                                                           ; only one client can be connected as a time
(defonce pending-messages (atom {}))                                                                                          ; a map of 'msg-id -> handler' for messages in flight where we wait for status responses, see ***

(defn connected? []
  (some? @current-client))

(defn get-current-options []
  (let [client @current-client]
    (assert client)
    (ws-client/get-options client)))

; -- pending messages -------------------------------------------------------------------------------------------------------

(defn register-pending-message-handler! [id handler]
  (swap! pending-messages assoc id handler))

(defn lookup-pending-message-handler [id]
  (get @pending-messages id))

(defn remove-pending-message-handler! [id]
  (swap! pending-messages dissoc id))

; -- deliver ----------------------------------------------------------------------------------------------------------------

(defn deliver-response [message]
  (let [id (:id message)]
    (if-some [handler (lookup-pending-message-handler id)]
      (handler message))))

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [msg]
  (if-some [client @current-client]
    (ws-client/send! client msg)
    (error "No client! => dropping msg" msg)))

(defn send-to-nrepl-tunnel! [tunnel-op msg]
  (send! {:op       tunnel-op
          :envelope msg}))

(defn tunnel-message! [msg]
  (send-to-nrepl-tunnel! :nrepl-message msg))

(defn go-tunnel-message-with-responses! [msg]
  (let [id (uuid/uuid-string (uuid/make-random-uuid))
        msg-with-id (assoc msg :id id)
        response-channel (go-channel)
        handler (fn [response-message]
                  (put! response-channel response-message)
                  (when (some? (:status response-message))
                    (remove-pending-message-handler! id)
                    (close! response-channel)))]
    (register-pending-message-handler! id handler)
    (tunnel-message! msg-with-id)
    (go
      (<! (go-wait (:response-timeout (get-current-options))))
      (close! response-channel))
    response-channel))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti go-process-message (fn [_client message] (:op message)))

(defmethod go-process-message :default [client message]
  (let [{:keys [out err ns status id value]} message]
    (when (some? value)
      (alter-meta! client assoc :last-value value))
    (when (some? ns)
      (console/set-prompt-ns! ns))
    (let [selected-compiler-id (get message :selected-compiler-id ::missing)
          default-compiler-id (get message :default-compiler-id)]
      (when (not= selected-compiler-id ::missing)
        (console/set-prompt-compiler! selected-compiler-id default-compiler-id)))
    (when (some? id)
      (deliver-response message)                                                                                              ; *** (see pending-messages above)
      (when (some? status)
        (console/announce-job-end! id)))

    (cond
      ; :out and :err messages are being sent by session middleware,
      ; we have our own output recoding based on recording driver, sent via :print-output message
      (some? out) nil                                                                                                         ; (eval/present-output id "stdout" out)
      (some? err) nil                                                                                                         ; (eval/present-output id "stderr" err)
      (some? ns) nil
      (some? status) nil
      :else (warn "received an unrecognized message from nREPL server" message)))
  (go))

(defmethod go-process-message :print-output [_client message]
  (let [{:keys [id content kind format]} message]
    (eval/go-present-server-side-output! id kind format content))
  (go))

(defmethod go-process-message :present-result [_client message]
  (let [{:keys [id value]} message]
    (eval/go-present-server-side-result! id value))
  (go))

; TODO: is this really needed?
(defmethod go-process-message :error [_client message]
  (error "Received an error message from nREPL server" message)
  (go
    {:op      :error
     :message (:type message)}))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn sanitize-message [message]
  (update message :op keyword))

(defn go-handle-message! [client message]
  (assert (= @current-client client))
  (go
    (let [sanitized-message (sanitize-message message)]
      (if-some [result (<! (go-process-message client sanitized-message))]
        (send! result)))))

(defn handle-message! [client message]
  (go-handle-message! client message))

(defn handle-open! [client]
  (reset! current-client client))

(defn handle-error! [client _event]
  (assert (= @current-client client)))

(defn handle-close! [_client]
  (reset! current-client nil))

(defn connect! [server-url opts]
  (assert (nil? @current-client))
  (let [default-opts {:name             "nREPL Tunnel Client"
                      :on-message       handle-message!
                      :on-open          handle-open!
                      :on-close         handle-close!
                      :on-error         handle-error!
                      :ready-msg        {:version implant-version/version}
                      :auto-reconnect?  true
                      :response-timeout 5000}
        effective-opts (merge default-opts opts)
        client (ws-client/connect! server-url effective-opts)]                                                                ; client will be set into current-client in on-open-handler
    (reset! wannabe-client client)
    true))

; this is a convenience function to attempt connection before auto-reconnect timeout fires
(defn try-connect! []
  (if-let [client @wannabe-client]
    (if-not (connected?)
      (ws-client/try-connect! client)
      (warn "client is already connected" @current-client client))
    (warn "call connect! first before try-connect!")))

(defn disconnect! []
  (when-let [client @current-client]
    (ws-client/close! client)
    true))
