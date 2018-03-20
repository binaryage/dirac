(ns marion.content-script.core
  (:require [cljs.core.async :refer [<! chan go-loop]]
            [oops.core :refer [oget ocall oapply]]
            [marion.content-script.logging :refer [log info warn error]]
            [marion.content-script.background :as background]
            [marion.content-script.page :as page]))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init")
  (page/install!)
  (background/go-connect!))
