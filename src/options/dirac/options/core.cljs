(ns dirac.options.core
  (:require [dirac.shared.async :refer [<! go]]
            [dirac.options.ui :as ui]
            [dirac.options.model :as model]))

(defn go-init! []
  (go
    (<! (model/go-init!))
    (ui/start-ui!)))
