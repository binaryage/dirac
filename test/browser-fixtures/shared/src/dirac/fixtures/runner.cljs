(ns dirac.fixtures.runner
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.fixtures.task :as task]))

; -- api accessed by runner.html --------------------------------------------------------------------------------------------

(defn ^:export reset []
  (task/cleanup!))

(defn ^:export reload []
  (reset)
  (go
    (<! (timeout 200))
    (ocall (oget js/document "location") "reload")))