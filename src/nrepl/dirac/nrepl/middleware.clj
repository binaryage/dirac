(ns dirac.nrepl.middleware
  (:require [clojure.tools.nrepl.middleware :refer (set-descriptor!)]
            [dirac.nrepl.piggieback :as piggieback]))

(def dirac-repl piggieback/wrap-cljs-repl)

(set-descriptor! #'dirac-repl
                 {:requires #{"clone"}
                  ; piggieback unconditionally hijacks eval and load-file
                  :expects  #{"eval" "load-file"}
                  :handles  {}})