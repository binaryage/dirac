(ns dirac.background.helpers
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan put! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.extension :as extension]
            [chromex.ext.runtime :as runtime]
            [dirac.settings :refer-macros [get-automation-entry-point-key
                                           get-flush-pending-feedback-messages-key
                                           get-dirac-intercom-key]]
            [dirac.background.action :as action]
            [dirac.background.state :as state]
            [dirac.utils :as utils]
            [cljs.reader :as reader])
  (:import goog.Uri
           goog.Uri.QueryData))

(defn ^:dynamic warn-about-unexpected-number-views [devtools-id views]
  (warn (str "found unexpected number views with enabled automation support for devtools #" devtools-id "\n")
        views "\n"
        "targeting only the first one"))

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
  (utils/parse-int (get-query-param (str url) "devtools_id")))

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

(defn safe-serialize [value]
  (try
    (pr-str value)
    (catch :default e
      (error "failed to serialize value:" value e))))

(defn safe-unserialize [serialized-value]
  (try
    (reader/read-string serialized-value)
    (catch :default e
      (error "failed to unserialize value:" serialized-value e)
      ::reply-unserialization-failed)))

(defn automate-action! [automate-fn action]
  (let [channel (chan)]
    (if-let [serialized-action (safe-serialize action)]
      (let [reply-callback (fn [serialized-reply]
                             (if-let [reply (safe-unserialize serialized-reply)]
                               (put! channel reply))
                             (close! channel))]
        ; WARNING: here we are crossing boundary between background and implant projects
        ;          both cljs code-bases are potentially compiled under :advanced mode but resulting in different minification
        ;          that is why we cannot pass any cljs values across this boundary
        ;          we have to strictly serialize results on both ends, that is why we use callbacks and do not pass channels
        (automate-fn serialized-action reply-callback))
      (put! channel ::action-serialization-failed))
    channel))

(defn automate-devtools! [devtools-id action]
  (let [matching-views-to-devtools-id (get-devtools-views devtools-id)
        matching-views-with-automation-support (filter has-automation-support? matching-views-to-devtools-id)]
    (if (> (count matching-views-with-automation-support) 1)
      (warn-about-unexpected-number-views devtools-id matching-views-with-automation-support))
    (if-let [view (first matching-views-with-automation-support)]
      (try
        (automate-action! (get-automation-entry-point view) action)
        (catch :default e
          (error (str "unable to automate dirac devtools #" devtools-id) view e)
          (go ::failure)))
      (go ::no-views))))

(defn close-all-extension-tabs! []
  (let [views (extension/get-views #js {:type "tab"})]
    (doseq [view views]
      (.close view))))

(defn install-intercom! [devtools-id handler]
  (let [matching-views (get-devtools-views devtools-id)]
    (if (= (count matching-views) 1)
      (let [view (first matching-views)]
        (oset view [(get-dirac-intercom-key)] handler)
        (when-let [flush-fn (oget view (get-flush-pending-feedback-messages-key))]
          (flush-fn)))
      (error "unable to install intercom from dirac extension to dirac frontend" devtools-id))))