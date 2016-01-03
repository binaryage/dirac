; This is Dirac's version of Weasel client.
; Initial version taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f.
;
; Protocol is the same, but this code runs inside DevTools and uses Chrome debugger to eval javascript in app's context.
; The advantage is that code gets evaluated even when app's javascript engine is paused on a breakpoint:
; - evals in the context of selected app's stack frame when debugger is paused
; - evals in app's global context when debugger is not paused
;
; When evaluating javascript snippets Weasel has to serialize eval results to strings to send them over the wire.
; Original Weasel's network handling code ran in the app's context, so it could use pr-str and similar for serialization.
; Our situation is more tricky, we have to wrap incoming javascript snippet with this serialization code, so
; that pr-str can happen in app's context using cljs runtime of the app, not cljs runtime of Dirac.
; We rely on some supporting code in devtools.dirac namespace which should be present in app's context,
; see dirac.implant.eval
;
(ns dirac.implant.weasel-client
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.implant.weasel-client :refer [log warn info error]])
  (:require [cljs.core.async :refer [<! chan put!]]
            [dirac.implant.eval :as eval]
            [dirac.implant.ws-client :as ws-client]))

(def current-client (atom nil))

; -- helpers ----------------------------------------------------------------------------------------------------------------

; result comes from javascript land as a json, but it has proper structure
; we simply convert various bits to cljs land
(defn massage-result [result]
  (-> result
      (js->clj :keywordize-keys true)
      (update :status keyword)))

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [msg]
  (if-let [client @current-client]
    (ws-client/send! client msg)
    (error "No client! => dropping msg" msg)))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti process-message :op)

(defmethod process-message :error [message]
  (error "Received error message" message)
  (go
    {:op      :error
     :message (:type message)}))

(defmethod process-message :eval-js [message]
  (go
    (let [result (<! (eval/eval-debugger-context-and-postprocess (:code message)))]                                           ; posprocessing step will prepare suitable result structure for us
      {:op    :result
       :value (massage-result result)})))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn on-message-handler [message]
  (go
    (if-let [result (<! (process-message message))]
      (send! result))))

(defn connect! [server-url opts]
  (let [default-opts {:name       "Weasel Client"
                      :on-message on-message-handler}
        effective-opts (merge default-opts opts)
        client (ws-client/connect! server-url effective-opts)]
    (reset! current-client client)))