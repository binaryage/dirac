(ns dirac.automation.runner
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.automation.helpers :as helpers]
            [dirac.automation.status-host :as status-host]
            [dirac.automation.messages :as messages]))

; -- support for manual pausing/resuming execution --------------------------------------------------------------------------

(def resume-events (chan))

(defn get-resume-button-el []
  (helpers/get-el-by-id "resume-button"))

(defn enable-resume! []
  (oset (get-resume-button-el) ["disabled"] false))

(defn disable-resume! []
  (oset (get-resume-button-el) ["disabled"] true))

(defn wait-for-resume! []
  (go
    (enable-resume!)
    (log "waiting for resume button click")
    (status-host/set-status! "click resume button")
    (let [res (<! resume-events)]
      (disable-resume!)
      res)))

; -- api accessed by runner.html --------------------------------------------------------------------------------------------

(defn ^:export reset []
  (messages/post-extension-command! {:command :tear-down} :no-timeout)
  (messages/post-message! #js {:type "marion-close-all-tabs"} :no-timeout))

(defn ^:export reload []
  (reset)
  (go
    (<! (timeout 200))
    (ocall (oget js/document "location") "reload")))

(defn ^:export resume []
  (put! resume-events :click))