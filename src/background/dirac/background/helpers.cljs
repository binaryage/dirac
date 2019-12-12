(ns dirac.background.helpers
  (:require [chromex.ext.extension :as extension]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.tabs :as tabs]
            [cljs.reader :as reader]
            [clojure.string :as string]
            [dirac.background.action :as action]
            [dirac.background.logging :refer [error info log warn]]
            [dirac.background.state :as state]
            [dirac.settings :refer [get-automation-entry-point-key
                                    get-dirac-intercom-key
                                    get-flush-pending-feedback-messages-key]]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]
            [dirac.shared.utils :as utils]
            [oops.core :refer [oapply ocall oget oget+ oset! oset!+]])
  (:import goog.Uri))

(defn ^:dynamic warn-about-unexpected-number-views [devtools-id views]
  (warn (str "found unexpected number of views with enabled automation support for devtools #" devtools-id "\n")
        views "\n"
        "targeting only the first one"))

; -- uri helpers ------------------------------------------------------------------------------------------------------------

(defn make-uri-object [url]
  (Uri. url))

(defn get-query-param [url param]
  (let [uri (make-uri-object url)]
    (.getParameterValue uri param)))

(defn build-query [params]
  (let [encode js/encodeURIComponent
        items (map (fn [[k v]] (str (encode k) "=" (encode v))) params)]
    (string/join "&" items)))

(defn make-relative-url [path params & [user-params-str]]
  {:pre [(map? params)
         (or (string? user-params-str) (nil? user-params-str))]}
  (let [non-empty-params (into {} (filter #(some? (second %)) params))
        url-params-segments (remove empty? [(build-query non-empty-params) user-params-str])]
    (str path "?" (string/join "&" url-params-segments))))

; -- dirac frontend url -----------------------------------------------------------------------------------------------------

(defn get-dirac-inspector-html-file-path []
  "devtools/front_end/inspector.html")

(defn make-blank-page-url []
  (runtime/get-url "blank.html"))

; example result:
; chrome-extension://mjdnckdilfjoenmikegbbenflgjcmbid/devtools/front_end/inspector.html?devtools_id=1&dirac_flags=11111&ws=localhost:9222/devtools/page/76BE0A6D-412C-4592-BC3C-ED3ECB5DFF8C
(defn make-dirac-frontend-url [devtools-id options]
  {:pre [devtools-id]}
  (let [{:keys [backend-url flags reset-settings automate extra-url-params user-url-params node?]} options]
    (assert backend-url)
    (assert flags)
    (let [html-file-path (get-dirac-inspector-html-file-path)
          mandatory-params {"devtools_id" devtools-id
                            "dirac_flags" flags
                            "ws"          backend-url}
          all-params (cond-> mandatory-params
                       ; add optional params
                       reset-settings (assoc "reset_settings" 1)
                       automate (assoc "dirac_automate" 1)
                       node? (assoc "v8only" "true")
                       extra-url-params (merge extra-url-params))]
      (runtime/get-url (make-relative-url html-file-path all-params user-url-params)))))

(defn extract-devtools-id-from-url [url]
  (utils/parse-int (get-query-param (str url) "devtools_id")))

; -- logging helpers --------------------------------------------------------------------------------------------------------

(defn tab-log-prefix [tab-id]
  (str "TAB #" tab-id ":"))

(defn go-log-in-tab! [tab-id method msg]
  (let [code (str "console." method "(\"" (utils/escape-double-quotes msg) "\")")]
    (tabs/execute-script tab-id #js {"code" code})))

(defn go-report-error-in-tab! [tab-id msg]
  (go-log-in-tab! tab-id "error" msg)
  (error (tab-log-prefix tab-id) msg)
  (state/post-feedback! (str "ERROR " (tab-log-prefix tab-id) " " msg))
  (action/go-update-action-button! tab-id :error msg))

(defn go-report-warning-in-tab! [tab-id msg]
  (go-log-in-tab! tab-id "warn" msg)
  (warn (tab-log-prefix tab-id) msg)
  (state/post-feedback! (str "WARNING " (tab-log-prefix tab-id) " " msg))
  (action/go-update-action-button! tab-id :warning msg))

; -- automation support -----------------------------------------------------------------------------------------------------

(defn is-devtools-view? [devtools-id view]
  (let [url (oget view "location")
        id (extract-devtools-id-from-url url)]
    (= id devtools-id)))

(defn get-devtools-views [devtools-id]
  (filter (partial is-devtools-view? devtools-id) (extension/get-views)))

(defn has-automation-support? [view]
  (some? (oget view "?" (get-automation-entry-point-key))))

(defn get-automation-entry-point [view]
  {:post [(fn? %)]}
  (oget+ view (get-automation-entry-point-key)))

(defn safe-serialize [value]
  (try
    (pr-str value)
    (catch :default e
      (error "failed to serialize value:" value e)
      (utils/make-error-struct e))))

(defn safe-unserialize [serialized-value]
  (try
    (reader/read-string serialized-value)
    (catch :default e
      (error "failed to unserialize value:" serialized-value e)
      (utils/make-error-struct e))))

(defn go-automate-action! [automate-fn action]
  (let [channel (go-channel)]
    (let [serialized-action (safe-serialize action)]
      (if-not (instance? js/Error serialized-action)
        (let [reply-callback (fn [serialized-reply]
                               (let [reply (safe-unserialize serialized-reply)]
                                 (assert (some? reply))
                                 (put! channel reply)))]
          ; WARNING: here we are crossing boundary between background and implant projects
          ;          both cljs code-bases are potentially compiled under :advanced mode but resulting in different minification
          ;          that is why we cannot pass any cljs values across this boundary
          ;          we have to strictly serialize results on both ends, that is why we use callbacks and do not pass channels
          (automate-fn serialized-action reply-callback))
        (put! channel serialized-action)))
    channel))

(defn go-automate-devtools! [devtools-id action]
  (let [matching-views-to-devtools-id (get-devtools-views devtools-id)
        matching-views-with-automation-support (filter has-automation-support? matching-views-to-devtools-id)]
    (if (> (count matching-views-with-automation-support) 1)
      (warn-about-unexpected-number-views devtools-id matching-views-with-automation-support))
    (if-let [view (first matching-views-with-automation-support)]
      (try
        (go-automate-action! (get-automation-entry-point view) action)
        (catch :default e
          (error (str "unable to automate dirac devtools #" devtools-id) view e)
          (go (utils/make-error-struct e))))
      (go (utils/make-error-struct (js/Error. (str "no views matching given devtools-id #" devtools-id)))))))

(defn perform-sanity-check-that-all-tabs-got-closed []
  (let [views (extension/get-views #js {:type "tab"})]
    (if (empty? views)
      true
      (do
        (error (str "not all extension tabs got closed after the close-all-extension-tabs! [" (count views) "]") views)
        false))))

(defn go-close-all-extension-tabs! []
  (go
    (let [views (extension/get-views #js {:type "tab"})]
      (doseq [view views]
        (try
          (.close view)
          (catch :default e
            (error "close-all-extension-tabs:" e)))))
    (<! (go-wait 500))                                                                                                        ; give it some time...
    (perform-sanity-check-that-all-tabs-got-closed)))

(defn install-intercom! [devtools-id handler]
  (let [matching-views (get-devtools-views devtools-id)]
    (if (= (count matching-views) 1)
      (if-let [view (first matching-views)]
        (do
          (oset! view "!" (get-dirac-intercom-key) handler)
          (if-let [flush-fn (oget view "?" (get-flush-pending-feedback-messages-key))]                                        ; this is optional for testing
            (flush-fn))
          true)
        "devtools view unexpectedly null")
      (str "unexpected count of devtools views: " (count matching-views)))))

(defn go-try-install-intercom! [devtools-id handler & [timeout-ms]]
  (let [timeout-chan (if (some? timeout-ms)
                       (go-wait timeout-ms))]
    (go
      (loop [iteration 1]
        (let [result (install-intercom! devtools-id handler)]
          (if (true? result)
            true
            (let [wait-chan (go-wait 100)
                  [_ ch] (alts! (filterv some? [wait-chan timeout-chan]))]
              (if (= ch timeout-chan)
                (str "timeouted after " iteration " trials (" timeout-ms "ms), " result)
                (recur (inc iteration))))))))))

(defn go-show-connecting-debugger-backend-status! [tab-id]
  (action/go-update-action-button! tab-id :connecting "Attempting to connect debugger backend..."))
