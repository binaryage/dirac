(ns dirac.automation.runner
  (:require [devtools.core :as devtools]
            [dirac.automation.helpers :as helpers]
            [dirac.automation.logging :refer [error info log warn]]
            [dirac.automation.messages :as messages]
            [dirac.automation.status-host :as status-host]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]
            [dirac.shared.cookies :as cookies]
            [dirac.shared.utils :refer [runonce]]
            [goog.style :as gstyle]
            [oops.core :refer [gcall! gset! oapply ocall oget oset!]]))

; -- state ------------------------------------------------------------------------------------------------------------------

(def resume-events (go-channel))
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
  (when-not (helpers/automated-testing?)
    (gstyle/setElementShown (get-control-panel-el) true)))

(defn go-reset-extensions! []
  (go
    (<! (messages/go-post-extension-command! {:command :tear-down} :no-timeout))
    (<! (messages/go-post-message! #js {:type "marion-close-all-tabs"} :no-timeout))))

; -- support for manual pausing/resuming execution --------------------------------------------------------------------------

(defn go-wait-for-resume! []
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

(defn go-wait-for-resume-if-paused! []
  (go
    (when @paused?
      (<! (go-wait-for-resume!))
      (vreset! paused? false))))

; -- api used by runner.html ------------------------------------------------------------------------------------------------

(defn ^:export reset []
  (go-reset-extensions!)
  (gset! "document.location" "/"))

(defn ^:export reload []
  (go-reset-extensions!)
  (go
    (<! (go-wait 200))                                                                                                        ; TODO: this should not be hard-coded FLAKY!
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
