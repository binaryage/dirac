(ns dirac.background.helpers
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [dirac.background.action :as action]
            [dirac.utils :as utils]))

(defn get-devtools-url [backend-url]
  (runtime/get-url (str "devtools/front_end/inspector.html?ws=" backend-url)))

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