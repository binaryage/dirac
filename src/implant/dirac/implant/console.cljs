(ns dirac.implant.console
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.implant.helpers :refer [get-console-view]]))

(defn announce-job-start! [job-id info]
  (group (str "nREPL JOB #" job-id) info)
  (if-let [console-view (get-console-view)]
    (ocall console-view "onJobStarted" job-id)))

(defn announce-job-end! [job-id]
  (group-end)
  (if-let [console-view (get-console-view)]
    (ocall console-view "onJobEnded" job-id)))

(defn set-prompt-ns! [ns-name]
  (if-let [console-view (get-console-view)]
    (ocall console-view "setDiracPromptNS" ns-name)))

(defn set-prompt-mode! [mode]
  (let [mode-str (name mode)]
    (assert (#{"status" "edit"} mode-str))
    (if-let [console-view (get-console-view)]
      (ocall console-view "setDiracPromptMode" mode-str))))

(defn set-prompt-status-content! [status]
  {:pre [(string? status)]}
  (if-let [console-view (get-console-view)]
    (ocall console-view "setDiracPromptStatusContent" status)))

; banner is an overlay text on the right side of prompt in "status" mode
(defn set-prompt-status-banner! [banner]
  {:pre [(string? banner)]}
  (if-let [console-view (get-console-view)]
    (ocall console-view "setDiracPromptStatusBanner" banner)))

(defn set-prompt-status-style! [style]
  (let [style (name style)]
    (assert (#{"error" "info"} style))
    (if-let [console-view (get-console-view)]
      (ocall console-view "setDiracPromptStatusStyle" style))))
