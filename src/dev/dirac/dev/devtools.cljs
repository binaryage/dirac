(ns dirac.dev.devtools
  (:require [devtools.core :as devtools]))

; -------------------------------------------------------------------------------------------------------------------

(devtools/enable-feature! :sanity-hints :dirac)
(devtools/install!)
