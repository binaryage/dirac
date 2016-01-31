(ns p01.core
  (:require [devtools.core :as devtools]))

(defn ^:export start []
  (devtools/enable-feature! :dirac :sanity-hints)
  (devtools/install!))