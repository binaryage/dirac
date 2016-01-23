(ns dirac.implant.console
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]))

(defn get-console-view []
  (if-let [console-panel (oget js/window "WebInspector" "ConsolePanel")]
    (if-let [console-view (ocall console-panel "_view")]
      console-view
      (warn "Dirac: Unable to obtain console view from DevTools"))
    (warn "Dirac: Unable to obtain console panel from DevTools")))

(defn set-repl-ns! [ns-name]
  (if-let [console-view (get-console-view)]
    (ocall console-view "setDiracReplNS" ns-name)))

(defn announce-job-start! [job-id info]
  (group (str "nREPL JOB #" job-id) info)
  (if-let [console-view (get-console-view)]
    (ocall console-view "onJobStarted" job-id)))

(defn announce-job-end! [job-id]
  (group-end)
  (if-let [console-view (get-console-view)]
    (ocall console-view "onJobEnded" job-id)))

(defn set-prompt-mode! [mode]
  (if-let [console-view (get-console-view)]
    (ocall console-view "setDiracPromptMode" mode)))

(defn set-prompt-status! [status]
  (if-let [console-view (get-console-view)]
    (ocall console-view "updateDiracPromptStatus" status)))

(defn set-prompt-banner! [banner]
  (if-let [console-view (get-console-view)]
    (ocall console-view "updateDiracPromptBanner" banner)))