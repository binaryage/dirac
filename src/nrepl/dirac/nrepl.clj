(ns dirac.nrepl
  (:require [clojure.tools.nrepl.middleware :refer [set-descriptor!]]
            [clojure.tools.logging :as log]
            [dirac.nrepl.piggieback :as piggieback]
            [dirac.nrepl.config :as config]
            [dirac.nrepl.bootstrap :as bootstrap]
            [dirac.lib.utils :as utils]))

; -- public middleware definition -------------------------------------------------------------------------------------------

(def middleware piggieback/dirac-nrepl-middleware)

(set-descriptor! #'middleware
                 {:requires #{"clone"}
                  :expects  #{"eval" "load-file"}                                                                             ; piggieback unconditionally hijacks eval and load-file
                  :handles  {"identify-dirac-nrepl-middleware"
                             {:doc      "Checks for presence of Dirac nREPL middleware"
                              :requires {}
                              :optional {}
                              :returns  {"version" "Version of Dirac nREPL middleware."}}}})

; -- support for booting into CLJS REPL -------------------------------------------------------------------------------------

(defn boot-dirac-repl! [& [config]]
  (let [effective-config (config/get-effective-config config)]
    (log/debug "boot-dirac-repl! with effective config:\n" (utils/pp effective-config))
    (bootstrap/bootstrap! effective-config))
  true)
