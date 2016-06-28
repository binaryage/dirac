(ns dirac.nrepl
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.logging :as log]
            [clojure.tools.nrepl.middleware :refer (set-descriptor!)]
            [dirac.lib.weasel-server :as weasel-server]
            [dirac.logging :as logging]
            [dirac.nrepl.piggieback :as piggieback]
            [dirac.nrepl.config :as config]))

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

(defn after-launch! [runtime-tag repl-env weasel-url]
  (log/trace "after-launch handler called with repl-env:\n" (logging/pprint repl-env))
  (piggieback/weasel-launched! weasel-url runtime-tag))

(defn bootstrap! [& [config]]
  (let [effective-confg (config/get-effective-config config)
        weasel-repl-options (:weasel-repl effective-confg)
        repl-options (assoc weasel-repl-options :after-launch (partial after-launch! (:runtime-tag effective-confg)))
        repl-env (weasel-server/make-weasel-repl-env repl-options)]
    (log/trace "starting cljs-repl with repl-env:\n" (logging/pprint repl-env))
    (piggieback/start-cljs-repl! repl-env)))

(defn boot-dirac-repl! [& [config]]
  (let [effective-config (config/get-effective-config config)]
    (if-not (:skip-logging-setup effective-config)
      (logging/setup! effective-config))
    (log/debug "boot-dirac-repl! with effective config:\n" (logging/pprint effective-config)))
  (bootstrap! config)
  true)
