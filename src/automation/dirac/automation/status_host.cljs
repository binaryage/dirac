(ns dirac.automation.status-host
  (:require [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.automation.helpers :as helpers]
            [dirac.automation.status :as status]))

(defonce current-status (atom nil))

(defn set-status! [text]
  (status/set-status! @current-status text))

(defn init-status! [id]
  (let [status-el (status/create-status! (helpers/get-el-by-id id))]
    (reset! current-status status-el)
    (set-status! "ready to run")))

(defn set-style! [style]
  (status/set-style! @current-status style))
