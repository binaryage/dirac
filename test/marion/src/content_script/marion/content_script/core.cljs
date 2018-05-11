(ns marion.content-script.core
  (:require [dirac.shared.async :refer [<! go-channel]]
            [marion.content-script.background :as background]
            [marion.content-script.logging :refer [error info log warn]]
            [marion.content-script.page :as page]
            [oops.core :refer [oapply ocall oget]]))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn init! []
  (log "init")
  (page/install!)
  (background/go-connect!))
