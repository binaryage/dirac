(ns marion.content-script.core
  (:require-macros [marion.content-script.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan go-loop]]
            [oops.core :refer [oget ocall oapply]]
            [marion.content-script.background :as background]))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init")
  (background/connect!))
