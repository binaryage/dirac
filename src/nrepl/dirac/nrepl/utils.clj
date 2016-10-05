(ns dirac.nrepl.utils
  "High-level helper methods possibly depending on mutable global state."
  (:require [cljs.analyzer :as analyzer]
            [dirac.nrepl.compilers :as compilers]
            [dirac.nrepl.protocol :as protocol]))

(defn prepare-current-env-info-response []
  (protocol/prepare-current-env-info-response analyzer/*cljs-ns*
                                              (compilers/get-selected-compiler-id)
                                              (compilers/get-default-compiler-id)))
