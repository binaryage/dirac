(ns dirac.implant.console
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.implant.helpers :refer [get-console-view]]))

(defonce ^:dynamic *last-prompt-ns* nil)
(defonce ^:dynamic *last-prompt-mode* :status)
(defonce ^:dynamic *last-prompt-status-content* "")
(defonce ^:dynamic *last-prompt-status-style* "")
(defonce ^:dynamic *last-prompt-status-banner* "")

(defn announce-job-start! [job-id info]
  (group (str "nREPL JOB #" job-id) info)
  (if-let [console-view (get-console-view)]
    (ocall console-view "onJobStarted" job-id)))

(defn announce-job-end! [job-id]
  (group-end)
  (if-let [console-view (get-console-view)]
    (ocall console-view "onJobEnded" job-id)))

(defn set-prompt-ns! [ns-name]
  {:pre [(string? ns-name)]}
  (when-not (= *last-prompt-ns* ns-name)
    (set! *last-prompt-ns* ns-name)
    (if-let [console-view (get-console-view)]
      (ocall console-view "setDiracPromptNS" ns-name))))

(defn set-prompt-mode! [mode]
  (when-not (= *last-prompt-mode* mode)
    (set! *last-prompt-mode* mode)
    (let [mode-str (name mode)]
      (assert (#{"status" "edit"} mode-str))
      (if-let [console-view (get-console-view)]
        (ocall console-view "setDiracPromptMode" mode-str)))))

(defn set-prompt-status-content! [content]
  {:pre [(string? content)]}
  (when-not (= *last-prompt-status-content* content)
    (set! *last-prompt-status-content* content)
    (if-let [console-view (get-console-view)]
      (ocall console-view "setDiracPromptStatusContent" content))))

; banner is an overlay text on the right side of prompt in "status" mode
(defn set-prompt-status-banner! [banner]
  {:pre [(string? banner)]}
  (when-not (= *last-prompt-status-banner* banner)
    (set! *last-prompt-status-banner* banner)
    (if-let [console-view (get-console-view)]
      (ocall console-view "setDiracPromptStatusBanner" banner))))

(defn set-prompt-status-style! [style]
  (when-not (= *last-prompt-status-style* style)
    (set! *last-prompt-status-style* style)
    (let [style (name style)]
      (assert (#{"error" "info"} style))
      (if-let [console-view (get-console-view)]
        (ocall console-view "setDiracPromptStatusStyle" style)))))

(defn append-dirac-command! [code job-id]
  {:pre [(string? code)]}
  (if-let [console-view (get-console-view)]
    (ocall console-view "appendDiracCommand" code job-id)))