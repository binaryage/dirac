(ns dirac.fixtures.embedcom)

; helpers for communication between tested page and marionette extension
;
; see https://developer.chrome.com/extensions/content_scripts#host-page-communication

(defn post-page-event! [data]
  (.postMessage js/window #js {:type "marion-command" :payload (pr-str data)} "*"))