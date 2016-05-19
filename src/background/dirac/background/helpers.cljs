(ns dirac.background.helpers
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.extension :as extension]
            [chromex.ext.runtime :as runtime]
            [dirac.settings :refer-macros [get-automation-entry-point-key]]
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
  {:pre [(map? params)]}
  (let [non-empty-params (into {} (filter second params))]
    (str path "?" (.toDecodedString (.createFromMap QueryData (clj->js non-empty-params))))))

; -- dirac frontend url -----------------------------------------------------------------------------------------------------

(defn get-dirac-main-html-file-path []
  "devtools/front_end/inspector.html")

(defn make-blank-page-url []
  (runtime/get-url "blank.html"))

; example result:
; chrome-extension://mjdnckdilfjoenmikegbbenflgjcmbid/devtools/front_end/inspector.html?devtools_id=1&dirac_flags=11111&ws=localhost:9222/devtools/page/76BE0A6D-412C-4592-BC3C-ED3ECB5DFF8C
(defn make-dirac-frontend-url [devtools-id options]
  {:pre [devtools-id]}
  (let [{:keys [backend-url flags reset-settings automate]} options]
    (assert backend-url)
    (assert flags)
    (let [html-file-path (get-dirac-main-html-file-path)
          manadatory-params {"devtools_id" devtools-id
                             "dirac_flags" flags
                             "ws"          backend-url}
          all-params (cond-> manadatory-params
                       ; add optional params
                       reset-settings (assoc "reset_settings" 1)
                       automate (assoc "dirac_automate" 1))]
      (runtime/get-url (make-relative-url html-file-path all-params)))))

(defn extract-devtools-id-from-url [url]
  (int (get-query-param (str url) "devtools_id")))

; -- logging helpers --------------------------------------------------------------------------------------------------------

(defn tab-log-prefix [tab-id]
  (str "TAB #" tab-id ":"))

(defn log-in-tab [tab-id method msg]
  (let [code (str "console." method "(\"" (utils/escape-double-quotes msg) "\")")]
    (tabs/execute-script tab-id #js {"code" code})))

(defn report-error-in-tab [tab-id msg]
  (log-in-tab tab-id "error" msg)
  (error (tab-log-prefix tab-id) msg)
  (state/post-feedback! (str "ERROR " (tab-log-prefix tab-id) " " msg))
  (action/update-action-button! tab-id :error msg))

(defn report-warning-in-tab [tab-id msg]
  (log-in-tab tab-id "warn" msg)
  (warn (tab-log-prefix tab-id) msg)
  (state/post-feedback! (str "WARNING " (tab-log-prefix tab-id) " " msg))
  (action/update-action-button! tab-id :warning msg))

; -- automation support -----------------------------------------------------------------------------------------------------

(defn is-devtools-view? [devtools-id view]
  (let [url (oget view "location")
        id (extract-devtools-id-from-url url)]
    (= id devtools-id)))

(defn get-devtools-views [devtools-id]
  (filter (partial is-devtools-view? devtools-id) (extension/get-views)))

(defn has-automation-support? [view]
  (some? (oget view (get-automation-entry-point-key))))

(defn get-automation-entry-point [view]
  {:post [(fn? %)]}
  (oget view (get-automation-entry-point-key)))

(defn automate-devtools! [devtools-id action]
  (go
    (let [matching-views (get-devtools-views devtools-id)
          matching-views-with-automation-support (filter has-automation-support? matching-views)]
      (if (> (count matching-views-with-automation-support) 1)
        (warn (str "found unexpected number views with enabled automation support for devtools #" devtools-id "\n")
              matching-views-with-automation-support "\n"
              "targeting only the first one"))
      (if-let [view (first matching-views-with-automation-support)]
        (let [automate-fn (get-automation-entry-point view)]
          (try
            (<! (automate-fn (pr-str action)))
            (catch :default e
              (error (str "unable to automate dirac devtools #" devtools-id "\n")
                     view e))))))))

(defn close-all-extension-tabs! []
  (let [views (extension/get-views #js {:type "tab"})]
    (doseq [view views]
      (.close view))))

(defn install-intercom! [devtools-id handler]
  (let [matching-views (get-devtools-views devtools-id)]
    (if (= (count matching-views) 1)
      (let [view (first matching-views)]
        (oset view ["diracExtensionIntercom"] handler)
        (when-let [flush-fn (oget view "diracFlushPendingFeedbackMessages")]
          (flush-fn)))
      (error "unable to install intercom from dirac extension to dirac frontend" devtools-id))))