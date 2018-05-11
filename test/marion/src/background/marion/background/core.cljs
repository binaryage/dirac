(ns marion.background.core
  (:require [dirac.shared.async :refer [<! go go-channel go-wait]]
            [marion.background.chrome :as chrome]
            [marion.background.dirac :as dirac]
            [marion.background.logging :refer [error info log warn]]
            [oops.core :refer [oapply ocall oget]]))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init!")
  (chrome/start-event-loop!)
  (dirac/go-maintain-robust-connection-with-dirac-extension!))
