(ns dirac.background.tools
  (:require [chromex.ext.tabs :as tabs]
            [chromex.ext.windows :as windows]
            [dirac.background.debugging :refer [get-resolution-failure-reason go-resolve-backend-info resolution-failure?]]
            [dirac.background.devtools :as devtools]
            [dirac.background.helpers :as helpers :refer [go-report-error-in-tab!
                                                          go-report-warning-in-tab!
                                                          go-show-connecting-debugger-backend-status!]]
            [dirac.background.helpers :as helpers]
            [dirac.background.logging :refer [error info log warn]]
            [dirac.background.state :as state]
            [dirac.options.model :as options]
            [dirac.settings :refer [get-dirac-devtools-window-height
                                    get-dirac-devtools-window-left
                                    get-dirac-devtools-window-top
                                    get-dirac-devtools-window-width
                                    get-frontend-handshake-timeout
                                    get-frontend-loading-timeout
                                    get-intercom-init-timeout]]
            [dirac.shared.async :refer [<! close! go go-channel go-wait put!]]
            [dirac.shared.i18n :as i18n]
            [dirac.shared.sugar :as sugar]
            [dirac.shared.utils :as utils]
            [oops.core :refer [oapply ocall oget oset!]]))

; WARNING: keep this in sync with dirac.js/knownFeatureFlags
(def flag-keys [:enable-repl
                :enable-parinfer
                :enable-friendly-locals
                :enable-clustered-locals
                :inline-custom-formatters
                :welcome-message
                :clean-urls
                :beautify-function-names
                :link-actions])

(def last-active-tab-query #js {"lastFocusedWindow" true
                                "active"            true})

(def focus-window-params #js {"focused"       true
                              "drawAttention" true})

(def activate-tab-params #js {"active" true})

(defn get-dirac-flags []
  (let [options (options/get-options)
        flags (map #(get options %) flag-keys)]
    (apply str (map #(if % "1" "0") flags))))

(defn prepare-dirac-window-params [panel?]
  (let [window-params #js {:url  (helpers/make-blank-page-url)                                                                ; a blank page url is actually important here, url-less popups don't get assigned a tab-id
                           :type (if panel? "popup" "normal")}]
    ; during development we may want to override standard "cascading" of new windows and position the window explicitly
    (sugar/set-window-params-dimensions! window-params
                                         (get-dirac-devtools-window-left) (get-dirac-devtools-window-top)
                                         (get-dirac-devtools-window-width) (get-dirac-devtools-window-height))
    window-params))

(defn go-create-dirac-window! [panel?]
  (go
    (if-let [[window] (<! (windows/create (prepare-dirac-window-params panel?)))]
      (let [tabs (oget window "tabs")
            first-tab (aget tabs 0)]
        (sugar/get-tab-id first-tab)))))

(defn go-remove-window! [window-id]
  (windows/remove window-id))

(defn go-create-dirac-tab! []
  (go
    (if-let [[tab] (<! (tabs/create #js {:url (helpers/make-blank-page-url)}))]
      (sugar/get-tab-id tab))))

(defn get-dirac-open-as-setting []
  (let [setting (options/get-option :open-as)]
    (case setting
      "window" :window
      "tab" :tab
      :panel)))

(defn go-open-dirac-frontend! [open-as]
  (case open-as
    :tab (go-create-dirac-tab!)
    :panel (go-create-dirac-window! true)
    :window (go-create-dirac-window! false)))

(defn intercom-handler [message]
  (case (oget message "type")
    "marion-deliver-feedback" (state/post-to-marion! (oget message "envelope"))))

(defn automate-if-marion-present [options]
  (if (state/marion-present?)
    (assoc options :automate true)
    options))

(defn provide-user-url-params [options]
  (or
    (if-some [user-url-params (options/get-option :user-frontend-url-params)]
      (assoc options :user-url-params user-url-params))
    options))

(defn prepare-options [initial-options]
  (-> initial-options
      (automate-if-marion-present)
      (provide-user-url-params)))

(defn go-wait-for-handshake-completion! [frontend-tab-id timeout-ms]
  (helpers/go-wait-for-document-title! frontend-tab-id "#" timeout-ms))

(defn go-wait-for-loading-completion! [frontend-tab-id timeout-ms]
  (helpers/go-wait-for-document-title! frontend-tab-id "#" timeout-ms))

(defn go-connect-and-navigate-dirac-devtools! [frontend-tab-id backend-tab-id options]
  (let [devtools-id (devtools/register! frontend-tab-id backend-tab-id)
        full-options (prepare-options options)
        dirac-handshake-url (helpers/make-dirac-handshake-url full-options)
        dirac-frontend-url (helpers/make-dirac-frontend-url devtools-id full-options)]
    (go
      (<! (tabs/update frontend-tab-id #js {:url dirac-handshake-url}))
      (let [handshake-result (<! (go-wait-for-handshake-completion! frontend-tab-id (get-frontend-handshake-timeout)))]
        (if-not (true? handshake-result)
          (let [error-msg (i18n/unable-to-complete-frontend-handshake frontend-tab-id handshake-result)]
            (<! (go-report-error-in-tab! backend-tab-id error-msg)))))
      (<! (tabs/update frontend-tab-id #js {:url dirac-frontend-url}))
      (let [loading-result (<! (go-wait-for-loading-completion! frontend-tab-id (get-frontend-loading-timeout)))]
        (if-not (true? loading-result)
          (let [error-msg (i18n/unable-to-complete-frontend-loading frontend-tab-id loading-result)]
            (<! (go-report-error-in-tab! backend-tab-id error-msg)))))
      (let [intercom-result (<! (helpers/go-try-install-intercom! devtools-id intercom-handler (get-intercom-init-timeout)))]
        (if-not (true? intercom-result)
          (let [error-msg (i18n/unable-to-complete-intercom-initialization frontend-tab-id intercom-result)]
            (<! (go-report-error-in-tab! backend-tab-id error-msg)))))
      devtools-id)))

(defn go-create-dirac-devtools! [backend-tab-id options]
  (go
    (if-let [frontend-tab-id (<! (go-open-dirac-frontend! (:open-as options)))]
      (<! (go-connect-and-navigate-dirac-devtools! frontend-tab-id backend-tab-id options))
      (<! (go-report-error-in-tab! backend-tab-id (i18n/unable-to-create-dirac-tab))))))

(defn go-open-dirac-devtools! [tab options]
  (go
    (let [backend-tab-id (sugar/get-tab-id tab)
          tab-url (oget tab "url")
          debugger-url (options/get-option :target-url)]
      (assert backend-tab-id)
      (cond
        (not tab-url) (<! (go-report-error-in-tab! backend-tab-id (i18n/tab-cannot-be-debugged tab)))
        (not debugger-url) (<! (go-report-error-in-tab! backend-tab-id (i18n/debugger-url-not-specified)))
        :else (do
                (go-show-connecting-debugger-backend-status! backend-tab-id)
                (let [backend-info (<! (go-resolve-backend-info debugger-url tab-url))]
                  (if (resolution-failure? backend-info)
                    (let [reason (get-resolution-failure-reason backend-info)]
                      (<! (go-report-error-in-tab! backend-tab-id
                                                   (i18n/unable-to-resolve-backend-url debugger-url tab-url reason))))
                    (if (keyword-identical? backend-info :not-attachable)
                      (<! (go-report-warning-in-tab! backend-tab-id (i18n/cannot-attach-dirac debugger-url tab-url)))
                      (<! (go-create-dirac-devtools! backend-tab-id (assoc options
                                                                      :backend-url (:url backend-info)
                                                                      :node? (= (:type backend-info) :node))))))))))))

(defn go-activate-dirac-devtools! [tab-id]
  (go
    (if-some [{:keys [id frontend-tab-id]} (devtools/find-devtools-descriptor-for-backend-tab tab-id)]
      (do
        (if-some [dirac-window-id (<! (sugar/go-fetch-tab-window-id frontend-tab-id))]
          (windows/update dirac-window-id focus-window-params)
          (tabs/update frontend-tab-id activate-tab-params))
        id)
      (warn "activate-dirac-devtools! unable to lookup devtools descriptor for backend tab" tab-id))))

(defn go-activate-or-open-dirac-devtools! [tab & [options-overrides]]
  (go
    (let [tab-id (oget tab "id")]
      (if (devtools/backend-connected? tab-id)
        (<! (go-activate-dirac-devtools! tab-id))
        (let [options {:open-as (get-dirac-open-as-setting)
                       :flags   (get-dirac-flags)}]
          (<! (go-open-dirac-devtools! tab (merge options options-overrides))))))))                                           ; options come from dirac extension settings, but we can override them

(defn go-open-dirac-devtools-in-active-tab! [& [options-overrides]]
  (go
    (let [[tabs] (<! (tabs/query last-active-tab-query))]
      (if-some [tab (first tabs)]
        (<! (go-activate-or-open-dirac-devtools! tab options-overrides))
        (warn "no active tab?")))))

(defn go-close-tab-with-id! [tab-id-or-ids]
  (let [ids (if (coll? tab-id-or-ids)
              (into-array tab-id-or-ids)
              (utils/parse-int tab-id-or-ids))]
    (tabs/remove ids)))

(defn go-close-dirac-devtools! [devtools-id]
  (go
    (if-some [descriptor (state/get-devtools-descriptor devtools-id)]
      (do
        (<! (go-close-tab-with-id! (:frontend-tab-id descriptor)))
        true)
      (warn "requested closing unknown devtools" devtools-id))))

(defn go-focus-console-prompt-for-backend-tab! [backend-tab-id]
  {:pre [backend-tab-id]}
  (go
    (<! (go-activate-dirac-devtools! backend-tab-id))
    (if-some [{:keys [id]} (devtools/find-devtools-descriptor-for-backend-tab backend-tab-id)]
      (helpers/go-automate-devtools! id {:action :focus-best-console-prompt})
      (warn "id gone?" backend-tab-id))))

(defn go-focus-console-prompt-in-first-devtools! []
  (log "focus-console-prompt-in-first-devtools!")
  (go
    (let [first-devtools-descriptor (second (first (state/get-devtools-descriptors)))]
      (if-some [backend-tab-id (:backend-tab-id first-devtools-descriptor)]
        (<! (go-focus-console-prompt-for-backend-tab! backend-tab-id))
        (warn "cannot focus console prompt, no Dirac devtools available")))))

(defn go-focus-best-console-prompt! []
  (go
    (let [[tabs] (<! (tabs/query last-active-tab-query))]
      (if-some [tab (first tabs)]
        (let [active-tab-id (oget tab "id")]
          (if-some [active-devtools-descriptor (devtools/find-devtools-descriptor-for-frontend-tab active-tab-id)]
            (<! (go-focus-console-prompt-for-backend-tab! (:backend-tab-id active-devtools-descriptor)))                      ; in case devtools is already active => focus its console
            (if (devtools/backend-connected? active-tab-id)
              (<! (go-focus-console-prompt-for-backend-tab! active-tab-id))                                                   ; the case for active backend tab
              (<! (go-focus-console-prompt-in-first-devtools!)))))                                                            ; otherwise fallback to first devtools activation
        (<! (go-focus-console-prompt-in-first-devtools!))))))                                                                 ; this is the pathological case where there is no last active tab information
