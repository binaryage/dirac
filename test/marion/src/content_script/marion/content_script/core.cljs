(ns marion.content-script.core
  (:require [dirac.shared.async :refer [<! go-channel]]
            [oops.core :refer [oget ocall oapply]]
            [marion.content-script.logging :refer [log info warn error]]
            [marion.content-script.background :as background]
            [marion.content-script.page :as page]))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init")
  (page/install!)
  (background/go-connect!))
