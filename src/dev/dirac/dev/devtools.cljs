(ns dirac.dev.devtools
  (:require [chromex.logging :refer-macros [log info warn error group group-end]]
            [devtools.core :as devtools]))

; -------------------------------------------------------------------------------------------------------------------

(devtools/enable-feature! :sanity-hints :dirac)
(devtools/install!)
