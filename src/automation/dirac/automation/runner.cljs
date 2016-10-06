(ns dirac.automation.runner
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [devtools.preload]
            [dirac.automation.helpers :as helpers]
            [dirac.automation.status-host :as status-host]
            [dirac.automation.messages :as messages]))

; -- state ------------------------------------------------------------------------------------------------------------------

(def resume-events (chan))
(def paused? (volatile! false))

; -- DOM helpers ------------------------------------------------------------------------------------------------------------

(defn get-pause-button-el []
  (helpers/get-el-by-id "pause-button"))

(defn enable-pause-button! []
  (oset! (get-pause-button-el) "disabled" false))

(defn disable-pause-button! []
  (oset! (get-pause-button-el) "disabled" true))

(defn get-resume-button-el []
  (helpers/get-el-by-id "resume-button"))

(defn enable-resume-button! []
  (oset! (get-resume-button-el) "disabled" false))

(defn disable-resume-button! []
  (oset! (get-resume-button-el) "disabled" true))

; -- support for manual pausing/resuming execution --------------------------------------------------------------------------

(defn wait-for-resume! []
  (go
    (disable-pause-button!)
    (enable-resume-button!)
    (log "waiting for resume button click")
    (status-host/set-status! "click resume button")
    (let [res (<! resume-events)]
      (disable-resume-button!)
      (enable-pause-button!)
      (status-host/set-status! "resumed again")
      res)))

(defn wait-for-resume-if-paused! []
  (go
    (when @paused?
      (<! (wait-for-resume!))
      (vreset! paused? false))))

; -- api used by runner.html ------------------------------------------------------------------------------------------------

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

(defn ^:export pause []
  (vreset! paused? true))
