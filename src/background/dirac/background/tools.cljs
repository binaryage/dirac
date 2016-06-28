(ns dirac.background.tools
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan timeout]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.windows :as windows]
            [chromex.ext.tabs :as tabs]
            [dirac.settings :refer-macros [get-dirac-window-top get-dirac-window-left
                                           get-dirac-window-width get-dirac-window-height]]
            [dirac.target.core :refer [resolve-backend-url]]
            [dirac.i18n :as i18n]
            [dirac.sugar :as sugar]
            [dirac.background.helpers :as helpers :refer [report-error-in-tab report-warning-in-tab]]
            [dirac.background.devtools :as devtools]
            [dirac.options.model :as options]
            [dirac.background.state :as state]
            [dirac.background.helpers :as helpers]
            [dirac.utils :as utils]))

(def flag-keys [:enable-repl
                :enable-parinfer
                :enable-friendly-locals
                :enable-clustered-locals
                :inline-custom-formatters
                :welcome-message
                :clean-urls
                :beautify-function-names])

(def last-active-tab-query #js {"lastFocusedWindow" true
                                "active"            true})

(def focus-window-params #js {"focused"       true
                              "drawAttention" true})

(def activate-tab-params #js {"active" true})

(defn get-dirac-flags []
  (let [options (options/get-options)
        flags (map #(get options %) flag-keys)]
    (apply str (map #(if % "1" "0") flags))))

(defn create-dirac-window! [panel?]
  (let [window-params #js {:url  (helpers/make-blank-page-url)                                                                ; a blank page url is actually important here, url-less popups don't get assigned a tab-id
                           :type (if panel? "popup" "normal")}]
    ; during development we may want to override standard "cascading" of new windows and position the window explicitely
    (if-let [left (get-dirac-window-left)]
      (aset window-params "left" (utils/parse-int left)))
    (if-let [top (get-dirac-window-top)]
      (aset window-params "top" (utils/parse-int top)))
    (if-let [width (get-dirac-window-width)]
      (aset window-params "width" (utils/parse-int width)))
    (if-let [height (get-dirac-window-height)]
      (aset window-params "height" (utils/parse-int height)))
    (go
      (if-let [[window] (<! (windows/create window-params))]
        (let [tabs (oget window "tabs")
              first-tab (aget tabs 0)]
          (sugar/get-tab-id first-tab))))))

(defn create-dirac-tab! []
  (go
    (if-let [[tab] (<! (tabs/create #js {:url (helpers/make-blank-page-url)}))]
      (sugar/get-tab-id tab))))

(defn get-dirac-open-as-setting []
  (let [setting (options/get-option :open-as)]
    (case setting
      "window" :window
      "tab" :tab
      :panel)))

(defn open-dirac-frontend! [open-as]
  (case open-as
    :tab (create-dirac-tab!)
    :panel (create-dirac-window! true)
    :window (create-dirac-window! false)))

(defn intercom-handler [message]
  (case (oget message "type")
    "marion-deliver-feedback" (state/post-to-marion! (oget message "envelope"))))

(defn automate-if-marion-present [options]
  (if (state/marion-present?)
    (assoc options :automate true)
    options))

(defn connect-and-navigate-dirac-devtools! [frontend-tab-id backend-tab-id options]
  (let [devtools-id (devtools/register! frontend-tab-id backend-tab-id)
        dirac-frontend-url (helpers/make-dirac-frontend-url devtools-id (automate-if-marion-present options))]
    (go
      (<! (tabs/update frontend-tab-id #js {:url dirac-frontend-url}))
      (<! (timeout 500))                                                                                                      ; give the page some time load the document
      (helpers/install-intercom! devtools-id intercom-handler))))

(defn create-dirac-devtools! [backend-tab-id options]
  (go
    (if-let [frontend-tab-id (<! (open-dirac-frontend! (:open-as options)))]
      (<! (connect-and-navigate-dirac-devtools! frontend-tab-id backend-tab-id options))
      (report-error-in-tab backend-tab-id (i18n/unable-to-create-dirac-tab)))))

(defn open-dirac-devtools! [tab options]
  (go
    (let [backend-tab-id (sugar/get-tab-id tab)
          tab-url (oget tab "url")
          target-url (options/get-option :target-url)]
      (assert backend-tab-id)
      (cond
        (not tab-url) (report-error-in-tab backend-tab-id (i18n/tab-cannot-be-debugged tab))
        (not target-url) (report-error-in-tab backend-tab-id (i18n/target-url-not-specified))
        :else (if-let [backend-url (<! (resolve-backend-url target-url tab-url))]
                (if (keyword-identical? backend-url :not-attachable)
                  (report-warning-in-tab backend-tab-id (i18n/cannot-attach-dirac target-url tab-url))
                  (<! (create-dirac-devtools! backend-tab-id (assoc options :backend-url backend-url))))
                (report-error-in-tab backend-tab-id (i18n/unable-to-resolve-backend-url target-url tab-url)))))))

(defn activate-dirac-devtools! [tab-id]
  (go
    (if-let [{:keys [frontend-tab-id]} (devtools/find-devtools-descriptor-for-backend-tab tab-id)]
      (if-let [dirac-window-id (<! (sugar/fetch-tab-window-id frontend-tab-id))]
        (windows/update dirac-window-id focus-window-params)
        (tabs/update frontend-tab-id activate-tab-params))
      (warn "activate-dirac-devtools! unable to lookup devtools decriptor for backend tab" tab-id))))

(defn activate-or-open-dirac-devtools! [tab & [options-overrides]]
  (let [tab-id (oget tab "id")]
    (if (devtools/backend-connected? tab-id)
      (activate-dirac-devtools! tab-id)
      (let [options {:open-as (get-dirac-open-as-setting)
                     :flags   (get-dirac-flags)}]
        (open-dirac-devtools! tab (merge options options-overrides))))))                                                      ; options come from dirac extension settings, but we can override them

(defn open-dirac-devtools-in-active-tab! [& [options-overrides]]
  (go
    (let [[tabs] (<! (tabs/query last-active-tab-query))]
      (if-let [tab (first tabs)]
        (<! (activate-or-open-dirac-devtools! tab options-overrides))
        (warn "no active tab?")))))

(defn close-tab-with-id! [tab-id-or-ids]
  (let [ids (if (coll? tab-id-or-ids) (into-array tab-id-or-ids) (utils/parse-int tab-id-or-ids))]
    (tabs/remove ids)))

(defn close-dirac-devtools! [devtools-id]
  (go
    (if-let [descriptor (state/get-devtools-descriptor devtools-id)]
      (close-tab-with-id! (:frontend-tab-id descriptor))
      (warn "requested closing unknown devtools" devtools-id))))

(defn focus-console-prompt-for-backend-tab! [backend-tab-id]
  {:pre [backend-tab-id]}
  (go
    (<! (activate-dirac-devtools! backend-tab-id))
    (if-let [{:keys [id]} (devtools/find-devtools-descriptor-for-backend-tab backend-tab-id)]
      (helpers/automate-devtools! id {:action :focus-best-console-prompt})
      (warn "id gone?" backend-tab-id))))

(defn focus-console-prompt-in-first-devtools! []
  (log "focus-console-prompt-in-first-devtools!")
  (go
    (let [first-devtools-descriptor (second (first (state/get-devtools-descriptors)))]
      (if-let [backend-tab-id (:backend-tab-id first-devtools-descriptor)]
        (<! (focus-console-prompt-for-backend-tab! backend-tab-id))
        (warn "cannot focus console prompt, no Dirac devtools available")))))

(defn focus-best-console-prompt! []
  (go
    (let [[tabs] (<! (tabs/query last-active-tab-query))]
      (if-let [tab (first tabs)]
        (let [active-tab-id (oget tab "id")]
          (if-let [active-devtools-descriptor (devtools/find-devtools-descriptor-for-frontend-tab active-tab-id)]
            (<! (focus-console-prompt-for-backend-tab! (:backend-tab-id active-devtools-descriptor)))                         ; in case devtools is already active => focus its console
            (if (devtools/backend-connected? active-tab-id)
              (<! (focus-console-prompt-for-backend-tab! active-tab-id))                                                      ; the case for active backend tab
              (<! (focus-console-prompt-in-first-devtools!)))))                                                               ; otherwise fallback to first devtools activation
        (<! (focus-console-prompt-in-first-devtools!))))))                                                                    ; this is the pathological case where there is no last active tab information
