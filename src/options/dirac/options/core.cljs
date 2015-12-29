(ns dirac.options.core
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan]]
            [dirac.options.ui :as ui]
            [dirac.options.model :as model]))

(defn init! []
  (go
    (<! (model/init!))
    (ui/start-ui!)))