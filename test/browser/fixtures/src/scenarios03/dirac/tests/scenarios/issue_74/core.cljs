(ns dirac.tests.scenarios.issue-74.core)

(defn fn-with-breakpoint []
  (let [a 42]
    (js-debugger)
    (* a 2)))

(defn fn-with-async-breakpoint []
  (js/setTimeout fn-with-breakpoint 0)
  100)
