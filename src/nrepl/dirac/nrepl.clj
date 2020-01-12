(ns dirac.nrepl
  (:require [clojure.tools.logging :as log]
            [nrepl.middleware :refer [set-descriptor!]]
            [dirac.utils :as utils]
            [dirac.nrepl.bootstrap :as bootstrap]
            [dirac.nrepl.config :as config]
            [dirac.nrepl.piggieback :as piggieback]))

; -- public middleware definition -------------------------------------------------------------------------------------------

(def middleware piggieback/dirac-nrepl-middleware)

(set-descriptor! #'middleware
                 {:requires #{"clone"}
                  :expects  #{"eval" "load-file"}                                                                             ; piggieback unconditionally hijacks eval and load-file
                  :handles  {"identify-dirac-nrepl-middleware" {:doc      "Checks for presence of Dirac nREPL middleware"
                                                                :requires {}
                                                                :optional {}
                                                                :returns  {"version" "Version of Dirac nREPL middleware."}}
                             "dirac-devtools-request"          {:doc      "Handles a request from devtools UI"
                                                                :requires {}
                                                                :optional {}
                                                                :returns  {"result" "command result (if any)"}}}})

; -- support for booting into CLJS REPL -------------------------------------------------------------------------------------

(defn boot-dirac-repl! [& [config]]
  (let [effective-config (config/get-effective-config config)]
    (log/debug "boot-dirac-repl! with effective config:\n" (utils/pp effective-config))
    (bootstrap/bootstrap! effective-config))
  true)
