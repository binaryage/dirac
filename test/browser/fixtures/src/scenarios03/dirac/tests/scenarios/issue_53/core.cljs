(ns dirac.tests.scenarios.issue-53.core)

(defn breakpoint-fn1 []
  (let [x 1]
    (let [y 2]
      (let [x 3
            z #(println x)]
        (js-debugger)))))

(defn breakpoint-fn2 [one-one]
  (let [two-two 2]
    ((fn rebind [] one-one))
    (js-debugger)))
