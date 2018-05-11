(ns dirac.options.core
  (:require [dirac.options.model :as model]
            [dirac.options.ui :as ui]
            [dirac.shared.async :refer [<! go]]))

(defn go-init! []
  (go
    (<! (model/go-init!))
    (ui/start-ui!)))
