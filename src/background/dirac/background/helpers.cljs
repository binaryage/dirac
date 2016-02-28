(ns dirac.background.helpers
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [dirac.background.action :as action]
            [dirac.utils :as utils]))

(defn dirac-dev? []
  (boolean (oget js/window "diracDev")))

(defn get-dirac-main-html-file-path []
  (if (dirac-dev?)
    "devtools/front_end/dirac-dev.html"
    "devtools/front_end/dirac-rel.html"))

(defn get-devtools-url [backend-url flags]
  (let [html-file-path (get-dirac-main-html-file-path)]
    (runtime/get-url (str html-file-path "?dirac_flags=" flags "&ws=" backend-url))))

(defn tab-log-prefix [tab-id]
  (str "TAB #" tab-id ":"))

(defn log-in-tab [tab-id method msg]
  (let [code (str "console." method "(\"" (utils/escape-double-quotes msg) "\")")]
    (tabs/execute-script tab-id #js {"code" code})))

(defn report-error-in-tab [tab-id msg]
  (log-in-tab tab-id "error" msg)
  (error (tab-log-prefix tab-id) msg)
  (action/update-action-button tab-id :error msg))

(defn report-warning-in-tab [tab-id msg]
  (log-in-tab tab-id "warn" msg)
  (warn (tab-log-prefix tab-id) msg)
  (action/update-action-button tab-id :warning msg))