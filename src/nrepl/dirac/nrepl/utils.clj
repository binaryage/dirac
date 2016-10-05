(ns dirac.nrepl.utils
  "High-level helper methods possibly depending on mutable global state."
  (:require [cljs.analyzer :as analyzer]
            [dirac.nrepl.compilers :as compilers]
            [dirac.nrepl.protocol :as protocol]))

(defn prepare-current-env-info-response []
  (let [current-ns (str analyzer/*cljs-ns*)
        selected-compiler-id (compilers/get-selected-compiler-id)
        default-compiler-id (compilers/get-default-compiler-id)]
    (protocol/prepare-current-env-info-response current-ns selected-compiler-id default-compiler-id)))
