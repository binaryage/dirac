(ns dirac.automation.transcript
  (:require [oops.core :refer [oget oset! ocall oapply]]))

; transcript is a <pre> tag which collects textual messages about test execution:
; 1) issued automation commands
; 2) dirac extension feedback
; 3) dirac frontend(s) feedback

; individual transcripts are checked against expected transcripts, see test/browser/transcripts

(defn set-style! [transcript-el & [style]]
  {:pre [transcript-el]}
  (set! (.-className transcript-el) (if (some? style)
                                      (str "transcript transcript-" style)
                                      "transcript")))

(defn make-transcript []
  (let [transcript-el (.createElement js/document "pre")]
    (set! (.-id transcript-el) "transcript")
    (set-style! transcript-el)
    transcript-el))

(defn create-transcript! [parent-el]
  {:pre [parent-el]}
  (let [transcript-el (make-transcript)]
    (.appendChild parent-el transcript-el)
    transcript-el))

(defn destroy-transcript! [transcript-el]
  {:pre [transcript-el]}
  (.remove transcript-el))

(defn append-to-transcript! [transcript-el text & [style]]
  {:pre [transcript-el]}
  (let [row-el (.createElement js/document "div")]
    (if (some? style)
      (.setAttribute row-el "style" style))
    (oset! row-el "textContent" text)
    (.appendChild transcript-el row-el)))

(defn read-transcript [transcript-el]
  {:pre [transcript-el]}
  (.-textContent transcript-el))

