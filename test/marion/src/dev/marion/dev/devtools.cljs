(ns marion.dev.devtools
  (:require [devtools.core :as devtools]))

(devtools/enable-feature! :sanity-hints)
(devtools/install!)
