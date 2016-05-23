(ns dirac.utils)

(defmacro runonce [& body]
  (let [code (cons 'do body)
        code-string (pr-str code)
        code-hash (hash code-string)
        name (symbol (str "runonce_" code-hash))]
    `(defonce ~name {:value ~code
                     :code  ~code-string})))

(defn timeout-display [time-ms]
  {:pre [(number? time-ms)]}
  (format "%.1fs" (/ time-ms 1000.)))
