(ns dirac.automation
  "High-level automamation API to be used from browser tests.

  All functions here should be called within `go-task` body.
  To open a new devtools instance use `open-devtools!` or a convenience macro `with-devtools`.
  Functions which have meta {:devtools true} can be called within `with-devtools` body with omitted devtools-id or you
  can pass a specific devtools-id returned from `open-devtools!`.

  Other functions do not target a specific devtools instance and can be called independently.
  "
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log error]]
            [dirac.automation.machinery :as machinery]
            [dirac.automation.helpers :as helpers]
            [dirac.automation.messages :as messages]
            [dirac.automation.matchers :as matchers]
            [dirac.automation.runner :as runner]
            [dirac.automation.transcript-host :as transcript]
            [dirac.automation.notifications :as notifications]
            [dirac.automation.options :as options]
            [dirac.utils :as utils]))

; -- automation actions -----------------------------------------------------------------------------------------------------

(defn wait-for-resume! []
  (runner/wait-for-resume!))

(defn wait-for-match [what & args]
  (let [matcher (matchers/make-generic-matcher what)
        description (matchers/get-generic-matcher-description what)]
    (apply transcript/wait-for-match matcher description args)))

(defn ^:devtools wait-for-devtools-match [devtools-id what & args]
  (let [matcher (matchers/make-and-matcher (matchers/make-devtools-matcher devtools-id)
                                           (matchers/make-generic-matcher what))
        description (str "devtools #" devtools-id ", " (matchers/get-generic-matcher-description what))]
    (apply transcript/wait-for-match matcher description args)))

(defn fire-chrome-event! [data]
  (messages/fire-chrome-event! data))

(defn ^:devtools automate-dirac-frontend! [devtools-id data]
  (messages/automate-dirac-frontend! devtools-id data))

(defn ^:devtools wait-for-devtools-unregistration [devtools-id]
  (wait-for-match (str "unregister devtools #" devtools-id)))

(defn wait-for-devtools-ready []
  (wait-for-match "devtools ready"))

(defn wait-for-panel-switch [name]
  (wait-for-match (str "setCurrentPanel: " name)))

(defn wait-for-devtools-boot []
  (go
    (<! (wait-for-devtools-ready))
    (<! (wait-for-panel-switch "elements"))                                                                                   ; because we have reset all devtools settings, the first landed panel will be "elements"
    (<! (wait-for-match "namespacesCache is cool now"))))                                                                     ; we need namespaces cache to be fully populated to prevent flaky tests

(defn ^:devtools wait-for-prompt-to-enter-edit-mode [devtools-id]
  (wait-for-devtools-match devtools-id "setDiracPromptMode('edit')"))

(defn ^:devtools wait-for-prompt-switch-to-dirac [devtools-id]
  (wait-for-devtools-match devtools-id "switched console prompt to 'dirac'"))

(defn ^:devtools wait-for-prompt-switch-to-js [devtools-id]
  (wait-for-devtools-match devtools-id "switched console prompt to 'js'"))

(defn ^:devtools wait-for-console-initialization [devtools-id]
  (wait-for-devtools-match devtools-id "console initialized"))

(defn set-options! [options]
  (messages/set-options! options))

(defn store-options! []
  (options/store-options!))

(defn restore-options! []
  (options/restore-options!))

(defn open-tab-with-scenario! [name & [params]]
  (messages/post-message! #js {:type "marion-open-tab-with-scenario" :url (helpers/get-scenario-url name params)}))

(defn close-tab-with-scenario! [scenario-id]
  (messages/post-message! #js {:type "marion-close-tab-with-scenario" :scenario-id scenario-id}))

(defn ^:devtools switch-devtools-panel! [devtools-id panel]
  (go
    (<! (automate-dirac-frontend! devtools-id {:action :switch-inspector-panel :panel panel}))
    (<! (wait-for-panel-switch (name panel)))))

(defn ^:devtools switch-prompt-to-dirac! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :switch-to-dirac-prompt}))

(defn ^:devtools switch-prompt-to-javascript! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :switch-to-js-prompt}))

(defn ^:devtools focus-console-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :focus-console-prompt}))

(defn ^:devtools clear-console-prompt! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :clear-console-prompt}))

(defn ^:devtools get-suggest-box-representation [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :get-suggest-box-representation}))

(defn ^:devtools print-suggest-box! [devtools-id]
  (go
    (let [text-representation (<! (get-suggest-box-representation devtools-id))]
      (assert (string? text-representation))
      (println text-representation))))

(defn ^:devtools get-suggest-box-item-count [devtools-id]
  (go
    (let [text-representation (<! (get-suggest-box-representation devtools-id))]
      (assert (string? text-representation))
      (if-let [m (re-find #"suggest box displays ([0-9]*?) items" text-representation)]
        (utils/parse-int (second m))))))

(defn ^:devtools get-prompt-representation [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :get-prompt-representation}))

(defn ^:devtools print-prompt! [devtools-id]
  (go
    (let [content (<! (get-prompt-representation devtools-id))]
      (assert (string? content))
      (println content)
      content)))

(defn ^:devtools trigger-internal-error! [devtools-id & [delay]]
  (automate-dirac-frontend! devtools-id {:action :trigger-internal-error
                                         :kind   :unhandled-exception
                                         :delay  (or delay 100)}))

(defn ^:devtools trigger-internal-error-in-promise! [devtools-id & [delay]]
  (automate-dirac-frontend! devtools-id {:action :trigger-internal-error
                                         :kind   :unhandled-exception-in-promise
                                         :delay  (or delay 100)}))

(defn ^:devtools trigger-internal-error-as-error-log! [devtools-id & [delay]]
  (automate-dirac-frontend! devtools-id {:action :trigger-internal-error
                                         :kind   :error-log
                                         :delay  (or delay 100)}))

(defn ^:devtools get-frontend-url-params [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :get-frontend-url-params}))

(defn ^:devtools scrape [devtools-id scraper-name & args]
  (automate-dirac-frontend! devtools-id {:action  :scrape
                                         :scraper scraper-name
                                         :args    args}))

(defn ^:devtools scrape! [devtools-id scraper-name & args]
  (go
    (let [content (<! (apply scrape devtools-id scraper-name args))]
      (println (str content))
      content)))

(defn ^:devtools simulate-console-input! [devtools-id input]
  {:pre [(string? input)]}
  (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-input
                                         :input  input}))

(defn ^:devtools simulate-console-action! [devtools-id action]
  {:pre [(string? action)]}
  (automate-dirac-frontend! devtools-id {:action :dispatch-console-prompt-action
                                         :input  action}))

(defn ^:devtools console-enter! [devtools-id input]
  (go
    (<! (clear-console-prompt! devtools-id))
    (<! (simulate-console-input! devtools-id input))
    (<! (simulate-console-action! devtools-id "enter"))))

(defn ^:devtools console-exec-and-match! [devtools-id input match-or-matches]
  (let [matches (if (coll? match-or-matches)
                  match-or-matches
                  [match-or-matches])]
    (go
      (<! (console-enter! devtools-id input))
      (doseq [match matches]
        (<! (wait-for-devtools-match devtools-id match)))
      (<! (wait-for-devtools-match devtools-id "repl eval job ended")))))

(defn ^:devtools enable-console-feedback! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :enable-console-feedback}))

(defn ^:devtools disable-console-feedback! [devtools-id]
  (automate-dirac-frontend! devtools-id {:action :disable-console-feedback}))

(defn ^:devtools switch-to-console-panel! [devtools-id]
  (switch-devtools-panel! devtools-id :console))

(defn open-devtools! [& [extra-url-params]]
  (go
    (let [devtools-id (<! (fire-chrome-event! [:chromex.ext.commands/on-command
                                               ["open-dirac-devtools" {:reset-settings   1
                                                                       :extra-url-params extra-url-params}]]))]
      (<! (wait-for-devtools-boot))
      (if-not (helpers/is-test-runner-present?)
        (messages/switch-to-task-runner-tab!))                                                                                ; for convenience
      (set! machinery/*last-devtools-id* devtools-id)
      (machinery/DevToolsID. devtools-id))))                                                                                  ; note: we wrap it so we can easily detect devtools-id parameters in action! method

(defn ^:devtools close-devtools! [devtools-id]
  (go
    (<! (fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" devtools-id]]))
    (<! (wait-for-devtools-unregistration devtools-id))))

(defn trigger! [trigger-name & [data]]
  (notifications/broadcast-notification! (merge {:trigger trigger-name} data)))

(defn separator! [& _args]
  (go))
