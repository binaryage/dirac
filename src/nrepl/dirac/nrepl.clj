(ns dirac.nrepl
  (:require [clojure.tools.nrepl.middleware :refer [set-descriptor!]]
            [clojure.tools.logging :as log]
            [dirac.lib.weasel-server :as weasel-server]
            [dirac.logging :as logging]
            [dirac.nrepl.piggieback :as piggieback]
            [dirac.nrepl.config :as config]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.debug :as debug]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.messages :as messages]
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
(defn send-bootstrap-info! [nrepl-message weasel-url]
  (assert (state/has-session?))                                                                                               ; we asssume this code is running within ensure-session
  (debug/log-stack-trace!)
  (let [info-message {:op         :bootstrap-info
                      :weasel-url weasel-url}]
    (log/debug "sending :bootstrap-info" info-message)
    (log/trace "send-bootstrap-info!" weasel-url "\n" (debug/pprint-nrepl-message nrepl-message))
    (helpers/send-response! nrepl-message info-message)))

(defn weasel-server-started! [nrepl-message weasel-url runtime-tag]
  (assert weasel-url)
  (assert (state/has-session?))                                                                                               ; we asssume this code is running within ensure-session
  (debug/log-stack-trace!)
  (let [{:keys [session transport]} nrepl-message]
    (sessions/add-dirac-session-descriptor! session transport runtime-tag)
    (send-bootstrap-info! nrepl-message weasel-url)))

(defn bootstrap! [& [config]]
  (if-let [nrepl-message (state/get-in-flight-nrepl-message)]
    (let [effective-nrepl-config (config/get-effective-config config)
          weasel-repl-options (:weasel-repl effective-nrepl-config)
          runtime-tag (:runtime-tag effective-nrepl-config)
          after-launch! (fn [repl-env weasel-url]
                          (log/trace "after-launch handler called with repl-env:\n" (logging/pprint repl-env))
                          (weasel-server-started! nrepl-message weasel-url runtime-tag))
          repl-options (assoc weasel-repl-options :after-launch after-launch!)
          repl-env (weasel-server/make-weasel-repl-env repl-options)
          cljs-repl-options (:cljs-repl-options effective-nrepl-config)]
      (state/ensure-session (:session nrepl-message)
        (piggieback/start-cljs-repl! nrepl-message effective-nrepl-config repl-env cljs-repl-options)))
    (do
      (log/error (messages/make-missing-nrepl-message-msg))
      (throw (ex-info "Unable to bootstrap due to missing in-flight nREPL message." {})))))

(defn boot-dirac-repl! [& [config]]
  (let [effective-config (config/get-effective-config config)]
    (if-not (:skip-logging-setup effective-config)
      (logging/setup! effective-config))
    (log/debug "boot-dirac-repl! with effective config:\n" (logging/pprint effective-config)))
  (bootstrap! config)
  true)
