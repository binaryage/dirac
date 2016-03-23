(ns marion.background.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.settings :refer [get-marion-initial-wait-time]]
                   [marion.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan timeout]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [marion.background.chrome :as chrome]
            [marion.background.dirac :as dirac]))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init!")
  (chrome/start-event-loop!)
  (go
    ; marion should give dirac extension some time to boot up and
    ; attempt first connection after dirac extension is likely to be ready
    (<! (timeout (get-marion-initial-wait-time)))
    (dirac/maintain-robust-connection-with-dirac-extension!)))