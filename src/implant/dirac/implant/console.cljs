(ns dirac.implant.console
  (:require [dirac.implant.helpers :refer [get-console-view]]
            [dirac.implant.logging :refer [error log warn]]
            [oops.core :refer [oapply ocall oget]]))

(defonce ^:dynamic *last-prompt-ns* nil)
(defonce ^:dynamic *last-prompt-compiler* nil)
(defonce ^:dynamic *last-prompt-mode* :status)
(defonce ^:dynamic *last-prompt-status-content* "")
(defonce ^:dynamic *last-prompt-status-style* "")
(defonce ^:dynamic *last-prompt-status-banner* "")

; -- pending jobs -----------------------------------------------------------------------------------------------------------

(defonce pending-jobs (atom {}))

(defn add-pending-job! [job-id]
  (swap! pending-jobs assoc job-id true))

(defn remove-pending-job! [job-id]
  (when (get @pending-jobs job-id)
    (swap! pending-jobs dissoc job-id)
    true))

; -- prompt API -------------------------------------------------------------------------------------------------------------

(defn announce-job-start! [job-id info]
  (add-pending-job! job-id)                                                                                                   ; TODO: implement timeouts
  (log (str "nREPL JOB #" job-id) info)
  (when-some [console-view (get-console-view)]
    (ocall console-view "onJobStarted" job-id)))

(defn announce-job-end! [job-id]
  ; only announce ending jobs which were started by us
  ; we have also some internal :eval request which don't trigger announce-job-start! but trigger announce-job-end!
  (when (remove-pending-job! job-id)
    (log (str "nREPL JOB #" job-id " ∎"))
    (when-some [console-view (get-console-view)]
      (ocall console-view "onJobEnded" job-id))))

(defn set-prompt-ns! [ns-name]
  {:pre [(string? ns-name)]}
  (when-not (= *last-prompt-ns* ns-name)
    (set! *last-prompt-ns* ns-name)
    (when-some [console-view (get-console-view)]
      (ocall console-view "setDiracPromptNS" ns-name))))

(defn set-prompt-compiler!* [compiler-id]
  {:pre [(string? compiler-id)]}
  (when-not (= *last-prompt-compiler* compiler-id)
    (set! *last-prompt-compiler* compiler-id)
    (when-some [console-view (get-console-view)]
      (ocall console-view "setDiracPromptCompiler" compiler-id))))

(defn set-prompt-compiler! [selected-compiler-id default-compiler-id]
  (let [display-id (cond
                     (nil? selected-compiler-id) "?"
                     (= selected-compiler-id default-compiler-id) ""                                                          ; compiler-id is not presented when it is default
                     :else selected-compiler-id)]
    (set-prompt-compiler!* display-id)))

(defn set-prompt-mode! [mode]
  (when-not (= *last-prompt-mode* mode)
    (set! *last-prompt-mode* mode)
    (let [mode-str (name mode)]
      (assert (#{"status" "edit"} mode-str))
      (when-some [console-view (get-console-view)]
        (ocall console-view "setDiracPromptMode" mode-str)))))

(defn set-prompt-status-content! [content]
  {:pre [(string? content)]}
  (when-not (= *last-prompt-status-content* content)
    (set! *last-prompt-status-content* content)
    (when-some [console-view (get-console-view)]
      (ocall console-view "setDiracPromptStatusContent" content))))

; banner is an overlay text on the right side of prompt in "status" mode
(defn set-prompt-status-banner! [banner]
  {:pre [(string? banner)]}
  (when-not (= *last-prompt-status-banner* banner)
    (set! *last-prompt-status-banner* banner)
    (when-some [console-view (get-console-view)]
      (ocall console-view "setDiracPromptStatusBanner" banner))))

(defn set-prompt-status-banner-callback! [callback]
  {:pre [(or (fn? callback) (nil? callback))]}
  (when-some [console-view (get-console-view)]
    (ocall console-view "setDiracPromptStatusBannerCallback" callback)))

(defn set-prompt-status-style! [style]
  (when-not (= *last-prompt-status-style* style)
    (set! *last-prompt-status-style* style)
    (let [style (name style)]
      (assert (#{"error" "info"} style))
      (when-some [console-view (get-console-view)]
        (ocall console-view "setDiracPromptStatusStyle" style)))))

(defn append-dirac-command! [code job-id]
  {:pre [(string? code)]}
  (when-some [console-view (get-console-view)]
    (ocall console-view "appendDiracCommand" code job-id)))

(defn switch-prompt! [prompt-id]
  {:pre [(#{"js" "dirac"} prompt-id)]}
  (when-some [console-view (get-console-view)]
    (ocall console-view "switchPrompt" prompt-id)
    true))

(defn get-current-prompt-id []
  (when-some [console-view (get-console-view)]
    (let [desc (ocall console-view "getCurrentPromptDescriptor")]
      (oget desc "id"))))
