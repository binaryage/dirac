(ns dirac.fixtures.transcript)

(defn make-transcript []
  (let [transcript-el (.createElement js/document "pre")]
    (set! (.-className transcript-el) "transcript")
    transcript-el))

(defn create-transcript! [parent-el]
  {:pre [parent-el]}
  (let [transcript-el (make-transcript)]
    (.appendChild parent-el transcript-el)
    transcript-el))

(defn destroy-transcript! [transcript-el]
  {:pre [transcript-el]}
  (.remove transcript-el))

(defn append-to-transcript! [transcript-el text]
  {:pre [transcript-el]}
  (let [new-text (str (.-textContent transcript-el) text)]
    (set! (.-textContent transcript-el) new-text)))

(defn read-transcript [transcript-el]
  {:pre [transcript-el]}
  (.-textContent transcript-el))