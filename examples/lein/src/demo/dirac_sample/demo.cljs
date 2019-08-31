(ns dirac-sample.demo
  (:require-macros [dirac-sample.logging :refer [log]])
  (:require [dirac.runtime :as dirac]))

; -- installation -----------------------------------------------------------------------------------------------------------

(enable-console-print!)

(println "tag:" (dirac/get-tag))

; -- hello demo -------------------------------------------------------------------------------------------------------------

(defn hello! [greetings]
  (log (str "Hello, " (or greetings "there") "!")))

; -- breakpoint demo --------------------------------------------------------------------------------------------------------

(defn breakpoint-demo [count]
  (let [numbers (range count)]
    (doseq [number numbers]
      (let [is-odd? (odd? number)
            line (str "number " number " is " (if is-odd? "odd" "even"))]
        (js-debugger)
        (println line)))))

(defn ^:export breakpoint-demo-handler []
  (log "calling breakpoint-demo:")
  (breakpoint-demo 3))

(comment
  ;
  ; some things to test in "joined" Cursive REPL
  ;
  ;   0. make sure nREPL server is up and running and your Dirac DevTools REPL is connected
  ;   1. connect Cursive to remote REPL on port 8230
  ;   2. run (dirac! :join)
  ;   3. switch to this file,
  ;   4  use Cursive's Tools -> REPL -> 'Switch REPL NS to current file'
  ;   5. use Cursive's Tools -> REPL -> 'Load File in REPL'
  ;   6. move cursor at closing brace of following form and use Cursive's Tools -> REPL -> 'Send ... to REPL'
  ;
  (hello! "from Cursive REPL"))

(log "demo loaded")
