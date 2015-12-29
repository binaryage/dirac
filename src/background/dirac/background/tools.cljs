(ns dirac.background.tools
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.windows :as windows]
            [chromex.ext.tabs :as tabs]
            [dirac.background.cors :refer [setup-cors-rewriting!]]
            [dirac.target.core :refer [resolve-backend-url]]
            [dirac.i18n :as i18n]
            [dirac.sugar :as sugar]
            [dirac.background.helpers :as helpers :refer [report-error-in-tab report-warning-in-tab]]
            [dirac.background.state :refer [state]]
            [dirac.background.connections :as connections]
            [dirac.options.model :as options]))

(defn create-dirac-window! [url panel?]
  {:pre [url]}
  (go
    (if-let [[window] (<! (windows/create #js {"url"  url
                                               "type" (if panel? "popup" "normal")}))]
      (let [tabs (oget window "tabs")
            first-tab (aget tabs 0)]
        (sugar/get-tab-id first-tab)))))

(defn create-dirac-tab! [url]
  {:pre [url]}
  (go
    (if-let [[tab] (<! (tabs/create #js {"url" url}))]
      (sugar/get-tab-id tab))))

(defn create-dirac! [backend-tab-id url open-as]
  {:pre [backend-tab-id url]}
  (go
    (if-let [dirac-tab-id (<! (if (keyword-identical? open-as :tab)
                                (create-dirac-tab! url)
                                (create-dirac-window! url (keyword-identical? open-as :panel))))]
      (connections/register-connection! dirac-tab-id backend-tab-id)
      (report-error-in-tab backend-tab-id (i18n/unable-to-create-dirac-tab)))))

(defn open-dirac! [tab open-as flags]
  (let [backend-tab-id (sugar/get-tab-id tab)
        tab-url (oget tab "url")
        target-url (options/get-option :target-url)]
    (assert backend-tab-id)
    (cond
      (not tab-url) (report-error-in-tab backend-tab-id (i18n/tab-cannot-be-debugged tab))
      (not target-url) (report-error-in-tab backend-tab-id (i18n/target-url-not-specified))
      :else (go
              (if-let [backend-url (<! (resolve-backend-url target-url tab-url))]
                (if (keyword-identical? backend-url :not-attachable)
                  (report-warning-in-tab backend-tab-id (i18n/cannot-attach-dirac target-url tab-url))
                  (create-dirac! backend-tab-id (helpers/get-devtools-url backend-url flags) open-as))
                (report-error-in-tab backend-tab-id (i18n/unable-to-resolve-backend-url target-url tab-url)))))))

(defn activate-dirac! [tab-id]
  (go
    (let [{:keys [dirac-tab-id]} (connections/find-backend-connection tab-id)
          _ (assert dirac-tab-id)
          dirac-window-id (<! (sugar/fetch-tab-window-id dirac-tab-id))]
      (if dirac-window-id
        (windows/update dirac-window-id #js {"focused"       true
                                             "drawAttention" true}))
      (tabs/update dirac-tab-id #js {"active" true}))))

(defn get-dirac-open-as-setting []
  (let [setting (options/get-option :open-as)]
    (case setting
      "window" :window
      "tab" :tab
      :panel)))

(def flag-keys [:enable-repl
                :enable-parinfer
                :enable-friendly-locals
                :enable-clustered-locals
                :inline-custom-formatters])

(defn get-dirac-flags []
  (let [options (options/get-options)
        flags (map #(get options %) flag-keys)]
    (apply str (map #(if % "1" "0") flags))))

(defn activate-or-open-dirac! [tab]
  (let [tab-id (oget tab "id")]
    (if (connections/backend-connected? tab-id)
      (activate-dirac! tab-id)
      (open-dirac! tab (get-dirac-open-as-setting) (get-dirac-flags)))))

(defn open-dirac-in-active-tab! []
  (go
    (let [[tabs] (<! (tabs/query #js {"lastFocusedWindow" true
                                      "active"            true}))]
      (if-let [tab (first tabs)]
        (activate-or-open-dirac! tab)
        (warn "No active tab?")))))