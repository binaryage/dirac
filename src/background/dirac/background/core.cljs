(ns dirac.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan put!]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender get-name]]
            [dirac.background.chrome :as chrome]
            [dirac.options.model :as options]))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init")
  (go
    (<! (options/init!))
    (chrome/start-chrome-event-loop!)))