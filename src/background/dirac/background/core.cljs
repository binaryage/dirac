(ns dirac.background.core
  (:require [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [dirac.background.action :as action]
            [dirac.background.chrome :as chrome]
            [dirac.background.logging :refer [error info log warn]]
            [dirac.background.state :as state]
            [dirac.options.model :as options]
            [dirac.shared.async :refer [<! go go-channel put!]]
            [oops.core :refer [oapply ocall oget]]))

; -- main entry point -------------------------------------------------------------------------------------------------------


(defn init! []
  (log "init")
  (go
    (<! (options/go-init!))
    (<! (action/go-set-active-icons!))                                                                                        ; by default we start with grayed-out icons, see manifest.json
    (<! (chrome/go-init-and-run-chrome-event-loop!))))
