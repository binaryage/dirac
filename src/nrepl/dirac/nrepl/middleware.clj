(ns dirac.nrepl.middleware
  (:require [clojure.tools.nrepl.middleware :refer (set-descriptor!)]
            [dirac.nrepl.piggieback :as piggieback]))

; THIS IS KEPT HERE FOR BACKWARD COMPATIBILITY, see new home for this in dirac.nrepl
; TODO: remove it eventually

(def dirac-repl piggieback/dirac-nrepl-middleware)

(set-descriptor! #'dirac-repl
                 {:requires #{"clone"}
                  :expects  #{"eval" "load-file"}                                                                             ; piggieback unconditionally hijacks eval and load-file
                  :handles  {"identify-dirac-nrepl-middleware"
                             {:doc      "Checks for presence of Dirac nREPL middleware"
                              :requires {}
                              :optional {}
                              :returns  {"version" "Version of Dirac nREPL middleware."}}}})