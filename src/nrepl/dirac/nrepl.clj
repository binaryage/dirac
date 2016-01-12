(ns dirac.nrepl
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.logging :as log]
            [dirac.lib.weasel-server :as weasel-server]
            [dirac.nrepl.logging :as logging]
            [dirac.nrepl.piggieback :as piggieback]
            [dirac.lib.utils :as utils]))

(def weasel-repl-options {:host  "localhost"
                          :port  8232
                          :range 10})

; -- support for booting into CLJS REPL -------------------------------------------------------------------------------------

(defn after-launch [repl-env url]
  (log/trace "after-launch" repl-env)
  (piggieback/send-bootstrap-info! url))

(defn bootstrap! []
  (let [repl-opts (assoc weasel-repl-options :after-launch after-launch)
        repl-env (weasel-server/make-weasel-repl-env repl-opts)]
    (log/trace "starting cljs-repl with " repl-env)
    (piggieback/cljs-repl repl-env)))

(defn boot-cljs-repl! [& [config]]
  ; this must be called from the main thread, piggieback/cljs-repl depends on it
  ; TODO: defensively check for it^
  (if-not (or (:skip-logging-setup config) (utils/env-val :dirac-agent-skip-logging-setup))
    (logging/setup-logging!))
  (log/debug "boot-cljs-repl!")
  (bootstrap!)
  true)