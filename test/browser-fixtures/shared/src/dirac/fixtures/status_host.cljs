(ns dirac.fixtures.status-host
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.fixtures.helpers :as helpers]
            [dirac.fixtures.status :as status]))

(defonce current-status (atom nil))

(defn set-status! [text]
  (status/set-status! @current-status text))

(defn init-status! [id]
  (let [status-el (status/create-status! (helpers/get-el-by-id id))]
    (reset! current-status status-el)
    (set-status! "ready to run")))