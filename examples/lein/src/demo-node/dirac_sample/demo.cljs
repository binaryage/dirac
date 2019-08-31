(ns dirac-sample.demo
  (:require-macros [dirac-sample.logging :refer [log]])
  (:require [dirac.runtime :as dirac]
            [cljs.nodejs :as nodejs]))

; -- hello demo -------------------------------------------------------------------------------------------------------------

(defn hello! [greetings]
  (log (str "Hello, " (or greetings "there") "!")))

; -- breakpoint demo --------------------------------------------------------------------------------------------------------

(defn breakpoint-demo [count]
  (let [numbers (range count)]
    (doseq [number numbers]
      (let [is-odd? (odd? number)
            line (str "number " number " is " (if is-odd? "odd" "even"))]
        (println line)
        (println "should stop on a breakpoint (if debugger attached)...")
        (js-debugger)))))

(defn call-breakpoint-demo! []
  (log "calling breakpoint-demo:")
  (breakpoint-demo 3))

; -- debugger exercise ------------------------------------------------------------------------------------------------------

(defn on-user-input [_text]
  (call-breakpoint-demo!)
  (println "Press ENTER to repeat or CTRL+C to exit"))

; http://st-on-it.blogspot.cz/2011/05/how-to-read-user-input-with-nodejs.html
(defn start-input-loop! [callback]
  (let [stdin js/process.stdin]
    (.setEncoding stdin "utf8")
    (.resume stdin)
    (.on stdin "data" callback)))

(defn run-debugger-exercise! []
  (println "attach a debugger and hit ENTER to call-breakpoint-demo!")
  (start-input-loop! on-user-input))

; -- main -------------------------------------------------------------------------------------------------------------------

(defn -main [& args]
  (hello! "Dirac")
  (println "tag:" (dirac/get-tag))
  (run-debugger-exercise!))

(nodejs/enable-util-print!)
(set! *main-cli-fn* -main)
