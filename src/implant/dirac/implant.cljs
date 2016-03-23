(ns dirac.implant
  (:require [dirac.dev]
            [dirac.implant.editor :as editor]
            [dirac.implant.intercom :as intercom]
            [dirac.implant.automation :as automation]
            [cljs.reader :as reader]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error]]
            [dirac.implant.eval :as eval]
            [dirac.implant.feedback-support :as feedback-support]))

(def ^:dynamic *console-initialized* false)
(def ^:dynamic *implant-initialized* false)

; -- exported API -----------------------------------------------------------------------------------------------------------
; don't forget to update externs.js when touching this API

(defn ^:export feedback [text]
  (feedback-support/post! text))

(defn ^:export automate [command]
  (try
    (automation/dispatch-command! command)
    (catch :default e
      (feedback (str "automation exception while performing " (pr-str command) " => " e))
      (throw e))))

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
  (let [editor (editor/create-editor! text-area-element :prompt use-parinfer?)]
    (editor/start-editor-sync!)
    editor))

(defn ^:export send-eval-request [request-id code]
  (intercom/send-eval-request! request-id code))

; -- automation -------------------------------------------------------------------------------------------------------------

(defn automation-handler [message]
  {:pre [(string? message)]}
  (let [command (reader/read-string message)]
    (automate command)))

(defn install-automation-support! []
  (oset js/window ["automateDirac"] automation-handler))

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

(init-implant!)