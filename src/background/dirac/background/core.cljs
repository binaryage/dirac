(ns dirac.background.core
  (:require-macros [dirac.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan put! go go-loop]]
            [oops.core :refer [oget ocall oapply]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender get-name]]
            [dirac.background.chrome :as chrome]
            [dirac.background.state :as state]
            [dirac.background.thief :as thief]
            [dirac.options.model :as options]
            [dirac.background.action :as action]))

(defn extract-apis! []
  (go
    (let [extract-api? (options/get-option :use-backend-supported-api)
          extract-css? (options/get-option :use-backend-supported-css)]
      (if (or extract-api? extract-css?)
        (let [[backend-api backend-css] (<! (thief/scrape-bundled-devtools!))]
          (if (and extract-api? (some? backend-api))
            (state/set-backend-api! backend-api))
          (if (and extract-css? (some? backend-css))
            (state/set-backend-css! backend-css)))))))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init")
  (go
    (<! (options/init!))
    (<! (extract-apis!))
    (<! (action/set-active-icons!))                                                                                           ; by default we start with grayed-out icons, see manifest.json
    (<! (chrome/start-chrome-event-loop!))))
