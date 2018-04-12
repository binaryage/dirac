(ns dirac.automation.transcript
  (:require [oops.core :refer [oget oset! ocall oapply gcall! ocall! gcall]]))

; transcript is a <pre> tag which collects textual messages about test execution:
; 1) issued automation commands
; 2) dirac extension feedback
; 3) dirac frontend(s) feedback

; individual transcripts are checked against expected transcripts, see test/browser/transcripts

(defn set-style! [transcript-el & [style]]
  {:pre [transcript-el]}
  (let [class-names (str "transcript" (if (some? style) (str " transcript-" style)))]
    (oset! transcript-el "className" class-names)))

(defn make-transcript []
  (let [transcript-el (gcall "document.createElement" "pre")]
    (oset! transcript-el "id" "transcript")
    (set-style! transcript-el)
    transcript-el))

(defn create-transcript! [parent-el]
  {:pre [parent-el]}
  (let [transcript-el (make-transcript)]
    (ocall! parent-el "appendChild" transcript-el)
    transcript-el))

(defn destroy-transcript! [transcript-el]
  {:pre [transcript-el]}
  (ocall! transcript-el "remove"))

(defn append-to-transcript! [transcript-el text & [style]]
  {:pre [transcript-el]}
  (let [row-el (gcall "document.createElement" "div")]
    (when (some? style)
      (ocall! row-el "setAttribute" "style" style))
    (oset! row-el "textContent" text)
    (ocall! transcript-el "appendChild" row-el)))

(defn read-transcript [transcript-el]
  {:pre [transcript-el]}
  (oget transcript-el "textContent"))
