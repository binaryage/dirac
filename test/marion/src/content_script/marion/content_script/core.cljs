(ns marion.content-script.core
  (:require-macros [cljs.core.async.macros :refer [go-loop]]
                   [marion.content-script.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan]]
            [oops.core :refer [oget ocall oapply]]
            [marion.content-script.background :as background]))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init")
  (background/connect!))
