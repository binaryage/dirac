(ns dirac.nrepl
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.logging :as log]
            [clojure.tools.nrepl.middleware :refer [set-descriptor!]]
            [dirac.lib.weasel-server :as weasel-server]
            [dirac.logging :as logging]
            [dirac.nrepl.piggieback :as piggieback]
            [dirac.nrepl.config :as config]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.debug :as debug]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.helpers :as helpers]))

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

; this message is sent to client after booting into a Dirac REPL
(defn send-bootstrap-info! [weasel-url]
  (assert (state/has-session?))                                                                                               ; we asssume this code is running within ensure-session
  (debug/log-stack-trace!)
  (let [nrepl-message (state/get-nrepl-message)
        info-message {:op         :bootstrap-info
                      :weasel-url weasel-url}]
    (log/debug "sending :bootstrap-info" info-message)
    (log/trace "send-bootstrap-info!" weasel-url "\n" (debug/pprint-nrepl-message nrepl-message))
    (helpers/send-response! nrepl-message info-message)))

(defn weasel-server-started! [weasel-url runtime-tag]
  (assert weasel-url)
  (assert (state/has-session?))                                                                                               ; we asssume this code is running within ensure-session
  (debug/log-stack-trace!)
  (let [{:keys [session transport]} (state/get-nrepl-message)]
    (sessions/add-dirac-session-descriptor! session transport runtime-tag)
    (send-bootstrap-info! weasel-url)))

(defn bootstrap! [& [config]]
  (let [effective-nrepl-confg (config/get-effective-config config)
        weasel-repl-options (:weasel-repl effective-nrepl-confg)
        runtime-tag (:runtime-tag effective-nrepl-confg)
        after-launch! (fn [repl-env weasel-url]
                        (log/trace "after-launch handler called with repl-env:\n" (logging/pprint repl-env))
                        (weasel-server-started! weasel-url runtime-tag))
        repl-options (assoc weasel-repl-options :after-launch after-launch!)
        repl-env (weasel-server/make-weasel-repl-env repl-options)
        cljs-repl-options (:cljs-repl-options effective-nrepl-confg)]
    (piggieback/start-cljs-repl! effective-nrepl-confg repl-env cljs-repl-options)))

(defn boot-dirac-repl! [& [config]]
  (let [effective-config (config/get-effective-config config)]
    (if-not (:skip-logging-setup effective-config)
      (logging/setup! effective-config))
    (log/debug "boot-dirac-repl! with effective config:\n" (logging/pprint effective-config)))
  (bootstrap! config)
  true)
