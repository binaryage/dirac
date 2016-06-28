(ns dirac.automation.status)

; status is a <div> tag which shows status of fixtures page

(defn set-style! [status-el & [style]]
  {:pre [status-el]}
  (set! (.-className status-el) (if (some? style)
                                  (str "status status-" style)
                                  "status")))

(defn make-status []
  (let [status-el (.createElement js/document "div")]
    (set-style! status-el)
    status-el))

(defn create-status! [parent-el]
  {:pre [parent-el]}
  (let [status-el (make-status)]
    (.appendChild parent-el status-el)
    status-el))

(defn destroy-status! [status-el]
  {:pre [status-el]}
  (.remove status-el))

(defn set-status! [status-el text]
  {:pre [status-el]}
  (set! (.-textContent status-el) text))

(defn clear-status! [status-el]
  {:pre [status-el]}
  (set-status! status-el ""))
