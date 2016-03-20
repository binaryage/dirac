(ns dirac.background.helpers
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.extension :as extension]
            [chromex.ext.runtime :as runtime]
            [dirac.background.action :as action]
            [dirac.background.state :as state]
            [dirac.utils :as utils])
  (:import goog.Uri
           goog.Uri.QueryData))

; -- uri helpers ------------------------------------------------------------------------------------------------------------

(defn make-uri-object [url]
  (Uri. url))

(defn get-query-param [url param]
  (let [uri (make-uri-object url)]
    (.getParameterValue uri param)))

(defn make-relative-url [path params]
  (str path "?" (.toDecodedString (.createFromMap QueryData (clj->js params)))))

; -- dirac frontend url -----------------------------------------------------------------------------------------------------

(defn get-dirac-main-html-file-path []
  "devtools/front_end/inspector.html")

(defn make-blank-page-url []
  (runtime/get-url "blank.html"))

; example result:
; chrome-extension://mjdnckdilfjoenmikegbbenflgjcmbid/devtools/front_end/inspector.html?connection_id=1&dirac_flags=11111&ws=localhost:9222/devtools/page/76BE0A6D-412C-4592-BC3C-ED3ECB5DFF8C
(defn make-dirac-frontend-url [backend-url connection-id flags]
  {:pre [backend-url connection-id flags]}
  (let [html-file-path (get-dirac-main-html-file-path)]
    (runtime/get-url (make-relative-url html-file-path {"connection_id" connection-id
                                                        "dirac_flags"   flags
                                                        "ws"            backend-url}))))

(defn extract-connection-id-from-url [url]
  (int (get-query-param (str url) "connection_id")))

; -- logging helpers --------------------------------------------------------------------------------------------------------

(defn tab-log-prefix [tab-id]
  (str "TAB #" tab-id ":"))

(defn log-in-tab [tab-id method msg]
  (let [code (str "console." method "(\"" (utils/escape-double-quotes msg) "\")")]
    (tabs/execute-script tab-id #js {"code" code})))

(defn report-error-in-tab [tab-id msg]
  (log-in-tab tab-id "error" msg)
  (error (tab-log-prefix tab-id) msg)
  (state/post-feedback-event! (str "ERROR "(tab-log-prefix tab-id) " " msg))
  (action/update-action-button tab-id :error msg))

(defn report-warning-in-tab [tab-id msg]
  (log-in-tab tab-id "warn" msg)
  (warn (tab-log-prefix tab-id) msg)
  (state/post-feedback-event! (str "WARNING "(tab-log-prefix tab-id) " " msg))
  (action/update-action-button tab-id :warning msg))

; -- automation support -----------------------------------------------------------------------------------------------------

(defn view-matches-connection? [connection-id view]
  (let [url (oget view "location")
        id (extract-connection-id-from-url url)]
    (= id connection-id)))

(defn get-views-matching-connection [connection-id]
  (filter (partial view-matches-connection? connection-id) (extension/get-views)))

(defn automate-dirac-connection! [connection-id action]
  (let [matching-views (get-views-matching-connection connection-id)]
    (doseq [view matching-views]
      (when-let [automate-fn (oget view "automateDirac")]
        (automate-fn (pr-str action))))))

(defn close-all-extension-tabs! []
  (let [views (extension/get-views #js {:type "tab"})]
    (doseq [view views]
      (.close view))))