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
  (:require [clojure.string :as string]
            [dirac.implant.eval :as eval]
            [dirac.implant.logging :refer [error info log warn]]
            [dirac.shared.ws-client :as ws-client]
            [dirac.shared.async :refer [<! go go-channel go-wait put!]]))

(defonce current-client (atom nil))

; -- helpers ----------------------------------------------------------------------------------------------------------------

; result comes from javascript land as a json, but it has proper structure
; we simply convert various bits to cljs land
(defn massage-result [result]
  (-> result
      (js->clj :keywordize-keys true)
      (update :status keyword)))

(defn prepare-result-message [result eval-id]
  {:op      :result
   :eval-id eval-id
   :value   (massage-result result)})

; -- message sending --------------------------------------------------------------------------------------------------------

(defn send! [msg]
  (if-some [client @current-client]
    (ws-client/send! client msg)
    (error "No client! => dropping msg" msg)))

(defn foreign-code? [code]
  (not (string/starts-with? code "dirac.runtime.repl.eval")))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmulti go-process-message :op)

(defmethod go-process-message :error [message]
  (error "Received error message" message)
  (go
    {:op      :error
     :message (:type message)}))

(defmethod go-process-message :eval-js [message]
  (let [options (ws-client/get-options @current-client)
        pre-eval-delay (:pre-eval-delay options)
        eval-id (:eval-id message)
        code (:code message)]
    (assert (some? eval-id) (str "expected some eval-id in " message))
    (go
      ; there might be some output printing messages in flight in the tunnel, so we give the tunnel some time to process them
      (when (some? pre-eval-delay)
        (<! (go-wait pre-eval-delay)))
      (let [[result error] (<! (eval/go-eval-in-current-context! code))
            result-data (cond
                          (some? error) (js-obj "status" "error" "value" error)
                          (foreign-code? code) (js-obj "status" "success" "value" result)                                     ; note that foreign code does not prepare result structure, so we do it here
                          :else result)]
        (prepare-result-message result-data eval-id)))))

; -- connection -------------------------------------------------------------------------------------------------------------

(defn go-handle-message! [message]
  (go
    (if-some [result (<! (go-process-message message))]
      (send! result))))

(defn handle-message! [_client message]
  (go-handle-message! message))

(defn connect! [server-url opts]
  (let [default-opts {:name       "Weasel Client"
                      :on-message handle-message!}
        effective-opts (merge default-opts opts)
        client (ws-client/connect! server-url effective-opts)]
    (reset! current-client client)))

(defn disconnect! []
  (when-some [client @current-client]
    (ws-client/close! client)
    true))
