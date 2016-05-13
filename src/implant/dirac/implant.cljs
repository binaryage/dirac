(ns dirac.implant
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [cljs.reader :as reader]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error]]
            [dirac.dev]
            [dirac.implant.editor :as editor]
            [dirac.implant.intercom :as intercom]
            [dirac.implant.automation :as automation]
            [dirac.implant.version :refer [version]]
            [dirac.implant.eval :as eval]
            [dirac.implant.feedback-support :as feedback-support]))

(defonce ^:dynamic *console-initialized* false)
(defonce ^:dynamic *implant-initialized* false)

; -- exported API -----------------------------------------------------------------------------------------------------------
;
; !!! don't forget to update externs.js when touching this !!!

(defn ^:export feedback [text]
  (feedback-support/post! text))

(defn ^:export automate [command]
  (let [commands (if (map? command) [command] command)]
    (try
      (doseq [command commands]
        (automation/dispatch-command! command))
      (catch :default e
        (feedback (str "automation exception while performing " (pr-str command) " => " e "\n"
                       (.-stack e)))
        (throw e)))))

(defn ^:export init-console []
  (when-not *console-initialized*
    (assert *implant-initialized*)
    (set! *console-initialized* true)
    (intercom/init!)
    (feedback "console initialized")))

(defn ^:export init-repl []
  (assert *implant-initialized*)
  (assert *console-initialized*)
  (intercom/init-repl!)
  (feedback "repl initialized"))

(defn ^:export adopt-prompt-element [text-area-element use-parinfer?]
  (feedback (str "adopt-prompt-element" " use-parinfer? " use-parinfer?))
  (let [editor (editor/create-editor! text-area-element :prompt use-parinfer?)]
    (editor/start-editor-sync!)
    editor))

(defn ^:export send-eval-request [request-id code scope-info]
  (feedback (str "send-eval-request: " code))
  (intercom/send-eval-request! request-id code scope-info))

(defn ^:export get-version []
  version)

(defn ^:export get-runtime-tag [callback]
  (go
    (let [tag (<! (eval/get-runtime-tag))]
      (callback tag))))

; -- automation -------------------------------------------------------------------------------------------------------------

(defn automation-handler [message]
  {:pre [(string? message)]}
  (let [command (reader/read-string message)]
    (automate command)))

(defn install-automation-support! []
  (oset js/window ["automateDiracDevTools"] automation-handler))

; -- init code --------------------------------------------------------------------------------------------------------------

(defn init-implant! []
  (when-not *implant-initialized*

    (set! *implant-initialized* true)
    (assert (not *console-initialized*))
    (install-automation-support!)
    (feedback-support/install!)
    (eval/start-eval-request-queue-processing-loop!)
    (feedback "implant initialized")))

; -- intialization ----------------------------------------------------------------------------------------------------------

(defonce _ (init-implant!))