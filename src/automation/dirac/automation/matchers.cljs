(ns dirac.automation.matchers)

; -- matchers ---------------------------------------------------------------------------------------------------------------

(defn make-re-matcher [re]
  (fn [[_label text]]
    (re-find re text)))

(defn make-substr-matcher [s]
  (fn [[_label text]]
    (not= (.indexOf text s) -1)))

(defn make-devtools-matcher [devtools-id]
  (fn [[label _text]]
    (= label (str "devtools #" devtools-id))))

(defn make-and-matcher [& fns]
  (fn [val]
    (every? #(% val) fns)))

(defn- make-generic-matcher [input]
  (cond
    (string? input) (make-substr-matcher input)
    (regexp? input) (make-re-matcher input)
    :else (throw (ex-info (str "don't know how to make matcher for " input " (" (type input) ")") input))))

(defn- get-generic-matcher-description [input]
  (str input))
