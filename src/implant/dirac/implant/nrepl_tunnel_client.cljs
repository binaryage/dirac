(ns dirac.implant.nrepl-tunnel-client
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.implant.nrepl-tunnel-client :refer [log warn info error]])
  (:require [cljs.core.async :refer [<! chan put! timeout close!]]
            [cljs-uuid-utils.core :as uuid]
            [dirac.implant.eval :as eval]
            [dirac.implant.ws-client :as ws-client]))

(def current-client (atom nil))
(def pending-messages (atom {}))

; -- pending messages -------------------------------------------------------------------------------------------------------

(defn register-pending-message-handler [id handler]
  (swap! pending-messages assoc id handler))

(defn lookup-pending-message-handler [id]
  (get @pending-messages id))

(defn remove-pending-message-handler [id]
  (swap! pending-messages dissoc id))

; -- deliver ----------------------------------------------------------------------------------------------------------------

(defn deliver-response [message]
  (let [id (:id message)]
    (when-let [handler (lookup-pending-message-handler id)]
      (handler message)
      (remove-pending-message-handler id))))

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [msg]
  (if-let [client @current-client]
    (ws-client/send! client msg)
    (error "No client! => dropping msg" msg)))

(defn send-to-nrepl-tunnel! [tunnel-op msg]
  (send! {:op       tunnel-op
          :envelope msg}))

(defn tunnel-message! [msg]
  (send-to-nrepl-tunnel! :nrepl-message msg))

(defn tunnel-message-with-response! [msg]
  (let [id (uuid/uuid-string (uuid/make-random-uuid))
        msg-with-id (assoc msg :id id)
        response (chan)
        timeout (timeout 5000)                                                                                                ; TODO: make timeout configurable
        handler (fn [response-message]
                  (put! response response-message)
                  (close! timeout))]
    (register-pending-message-handler id handler)
    (go
      (<! timeout)
      (deliver-response {:status ["timeout"]
                         :id     id}))
    (tunnel-message! msg-with-id)
    response))

; -- message processing -----------------------------------------------------------------------------------------------------

(defn boostrap-cljs-repl-message []
  {:op   "eval"
   :code (str "(do"
              "  (require 'dirac.nrepl)"
              "  (dirac.nrepl/boot-cljs-repl!))")})

(defmulti process-message (fn [_client message] (:op message)))

(defmethod process-message :default [client message]
  (let [{:keys [out err ns status id value]} message]
    (if value
      (alter-meta! client assoc :last-value value))
    (cond
      out (eval/present-out-message out)
      err (eval/present-err-message err)
      ns nil                                                                                                                  ; TODO
      status (if id
               (deliver-response message))                                                                                    ; TODO
      :else (do
              (warn "received unrecognized nREPL message" message))))
  nil)

(defmethod process-message :error [_client message]
  (error "Received error message" message)
  (go
    {:op      :error
     :message (:type message)}))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn sanitize-message [message]
  (update message :op keyword))

(defn on-message-handler [client message]
  (go
    (let [sanitized-message (sanitize-message message)]
      (if-let [message-chan (process-message client sanitized-message)]
        (if-let [result (<! message-chan)]
          (send! result))))))

(defn connect! [server-url opts]
  (let [default-opts {:name       "nREPL Tunnel Client"
                      :on-message on-message-handler}
        effective-opts (merge default-opts opts)
        client (ws-client/connect! server-url effective-opts)]
    (reset! current-client client)))