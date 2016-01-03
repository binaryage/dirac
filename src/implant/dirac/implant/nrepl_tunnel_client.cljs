(ns dirac.implant.nrepl-tunnel-client
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.implant.nrepl-tunnel-client :refer [log warn info error]])
  (:require [cljs.core.async :refer [<! chan put!]]
            [dirac.implant.ws-client :as ws-client]))

(def current-client (atom nil))

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [msg]
  (if-let [client @current-client]
    (ws-client/send! client msg)
    (error "No client! => dropping msg" msg)))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message :op)

(defmethod process-message :default [message]
  (warn "received unrecognized nREPL message" message)
  (go))

(defmethod process-message :error [message]
  (error "Received error message" message)
  (go
    {:op      :error
     :message (:type message)}))

#_(defmethod process-message :eval-js [message]
    (go
      (let [result (<! (eval/eval-debugger-context-and-postprocess (:code message)))                                          ; posprocessing step will prepare suitable result structure for us
            value (-> result
                      (js->clj :keywordize-keys true)
                      (update :status keyword))]
        {:op    :result
         :value value})))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn on-message-handler [message]
  (go
    (if-let [result (<! (process-message message))]
      (send! result))))

(defn connect! [server-url opts]
  (let [default-opts {:name       "nREPL Tunnel Client"
                      :on-message on-message-handler}
        effective-opts (merge default-opts opts)
        client (ws-client/connect! server-url effective-opts)]
    (reset! current-client client)))