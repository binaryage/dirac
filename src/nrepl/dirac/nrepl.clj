(ns dirac.nrepl
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.logging :as log]
            [dirac.lib.weasel-server :as weasel-server]
            [dirac.nrepl.logging :as logging]
            [dirac.nrepl.piggieback :as piggieback]
            [dirac.nrepl.config :as config]))

; -- support for booting into CLJS REPL -------------------------------------------------------------------------------------

(defn after-launch [repl-env url]
  (log/trace "after-launch handler called with repl-env:" repl-env)
  (piggieback/send-bootstrap-info! url))

(defn bootstrap! [& [config]]
  (let [effective-confg (config/get-effective-config config)
        weasel-repl-options (:weasel-repl effective-confg)
        repl-options (assoc weasel-repl-options :after-launch after-launch)
        repl-env (weasel-server/make-weasel-repl-env repl-options)]
    (log/trace "starting cljs-repl with repl-env:" repl-env)
    (piggieback/cljs-repl repl-env)))

(defn boot-cljs-repl! [& [config]]
  ; this must be called from the main thread, piggieback/cljs-repl depends on it
  ; TODO: defensively check for it^
  (let [effective-config (config/get-effective-config config)]
    (if-not (:skip-logging-setup effective-config)
      (logging/setup-logging! effective-config))
    (log/debug "boot-cljs-repl! with effective config:" effective-config))
  (bootstrap! config)
  true)