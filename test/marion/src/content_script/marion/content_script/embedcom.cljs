(ns marion.content-script.embedcom
  (:require [chromex.support :refer-macros [oget ocall oapply]]))

; helpers for communication between tested page and marionette extension
;
; see https://developer.chrome.com/extensions/content_scripts#host-page-communication

(defn process-event [handler event]
  (if (= (.-source event) js/window)
    (if-let [data (.-data event)]
      (case (.-type data)
        "marion-command" (handler (oget data "payload"))
        nil))))

(defn install! [handler]
  (.addEventListener js/window "message" (partial process-event handler)))