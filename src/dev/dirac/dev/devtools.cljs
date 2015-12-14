(ns dirac.dev.devtools
  (:require [chromex.logging :refer-macros [log info warn error group group-end]]
            [devtools.core :as devtools]))

; -------------------------------------------------------------------------------------------------------------------

(log "installing cljs-devtools")

(devtools/set-pref! :install-sanity-hints true)
(devtools/install!)
