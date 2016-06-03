(ns dirac.tests.scenarios.breakpoint.core)

(enable-console-print!)

(defn breakpoint-demo [count]
  (let [numbers (range count)]
    (doseq [number numbers]
      (let [is-odd? (odd? number)
            line (str "number " number " is " (if is-odd? "odd" "even"))]
        (js-debugger)
        (println line)))))

(defn ^:export breakpoint-demo-handler []
  (println "calling breakpoint-demo:")
  (breakpoint-demo 3))