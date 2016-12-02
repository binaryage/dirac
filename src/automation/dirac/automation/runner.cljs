(ns dirac.automation.runner
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [devtools.core :as devtools]
            [oops.core :refer [oget oset! ocall oapply gcall! gset!]]
            [chromex.logging :refer-macros [log warn error info]]
            [goog.style :as gstyle]
            [dirac.utils :refer-macros [runonce]]
            [dirac.automation.helpers :as helpers]
            [dirac.cookies :as cookies]
            [dirac.automation.status-host :as status-host]
            [dirac.automation.messages :as messages]))

; -- state ------------------------------------------------------------------------------------------------------------------

(def resume-events (chan))
(def paused? (volatile! false))
(def normalized (volatile! true))

(defn normalized? []
  @normalized)

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

(defn get-normalize-checkbox []
  (helpers/get-el-by-id "normalize-checkbox"))

(defn get-control-panel-el []
  (helpers/get-el-by-id "control-panel"))

(defn init-normalize-checkbox! []
  (let [checkbox-el (get-normalize-checkbox)
        checked? (not (= (cookies/get-cookie :normalize) "0"))]
    (vreset! normalized checked?)
    (oset! checkbox-el "checked" checked?)))

(defn init! []
  (init-normalize-checkbox!)
  (devtools/install!)
  (if-not (helpers/automated-testing?)
    (gstyle/setElementShown (get-control-panel-el) true)))

(defn reset-extensions! []
  (messages/post-extension-command! {:command :tear-down} :no-timeout)
  (messages/post-message! #js {:type "marion-close-all-tabs"} :no-timeout))

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
  (reset-extensions!)
  (gset! "document.location" "/"))

(defn ^:export reload []
  (reset-extensions!)
  (go
    (<! (timeout 200))
    (gcall! "document.location.reload")))

(defn ^:export resume []
  (put! resume-events :click))

(defn ^:export pause []
  (vreset! paused? true))

(defn ^:export normalize [el]
  (let [checked? (boolean (oget el "checked"))]
    (cookies/set-cookie :normalize (if checked? "1" "0") :max-age (* 60 60 24 365))
    (vreset! normalized checked?)))

(runonce
  (init!))
