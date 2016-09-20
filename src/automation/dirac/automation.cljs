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
            [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log error]]
            [dirac.automation.machinery :as machinery]
            [dirac.automation.helpers :as helpers]
            [dirac.automation.messages :as messages]
            [dirac.automation.runner :as runner]
            [dirac.automation.notifications :as notifications]
            [dirac.automation.options :as options]
            [dirac.automation.verbs :as verbs]
            [dirac.utils :as utils]))

; -- automation actions -----------------------------------------------------------------------------------------------------

(defn wait-for-resume! []
  (runner/wait-for-resume!))

(defn set-options! [options]
  (messages/set-options! options))

(defn store-options! []
  (options/store-options!))

(defn restore-options! []
  (options/restore-options!))

(defn open-scenario! [name & [params]]
  (messages/post-message! #js {:type "marion-open-scenario"
                               :url  (helpers/get-scenario-url name params)}))

(defn close-scenario! [scenario-id]
  (messages/post-message! #js {:type        "marion-close-scenario"
                               :scenario-id scenario-id}))

(defn trigger! [trigger-name & args]
  (notifications/broadcast-notification! {:trigger trigger-name
                                          :args    args}))

(defn wait-for-match [what & args]
  (apply verbs/wait-for-match what args))

(defn open-devtools! [& [extra-url-params]]
  (go
    (let [open-devtools-event [:chromex.ext.commands/on-command ["open-dirac-devtools" {:reset-settings   1
                                                                                        :extra-url-params extra-url-params}]]
          devtools-id (<! (messages/fire-chrome-event! open-devtools-event))]
      (<! (verbs/wait-for-devtools-boot devtools-id))
      (machinery/push-devtools-id-to-stack! devtools-id)
      (machinery/DevToolsID. devtools-id))))                                                                                  ; note: we wrap it so we can easily auto-fill devtools-id parameters in action! method

; -- devtools-instance targeting actions ------------------------------------------------------------------------------------

(defn ^:devtools close-devtools! [devtools-id]
  (go
    (<! (messages/fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" devtools-id]]))
    (<! (verbs/wait-for-devtools-unregistration devtools-id))
    (machinery/remove-devtools-id-from-stack! devtools-id)))

(defn ^:devtools wait-for-devtools-match [devtools-id what & args]
  (apply verbs/wait-for-devtools-match devtools-id what args))

(defn ^:devtools wait-for-prompt-to-enter-edit-mode [devtools-id]
  (wait-for-devtools-match devtools-id "setDiracPromptMode('edit')"))

(defn ^:devtools wait-for-prompt-switch-to-dirac [devtools-id]
  (wait-for-devtools-match devtools-id "switched console prompt to 'dirac'"))

(defn ^:devtools wait-for-prompt-switch-to-js [devtools-id]
  (wait-for-devtools-match devtools-id "switched console prompt to 'js'"))

(defn ^:devtools switch-devtools-panel! [devtools-id panel]
  (go
    (<! (verbs/automate-devtools! devtools-id {:action :switch-inspector-panel
                                               :panel  panel}))
    (<! (verbs/wait-for-panel-switch devtools-id (name panel)))))

(defn ^:devtools switch-prompt-to-dirac! [devtools-id]
  (verbs/automate-devtools! devtools-id {:action :switch-to-dirac-prompt}))

(defn ^:devtools switch-prompt-to-javascript! [devtools-id]
  (verbs/automate-devtools! devtools-id {:action :switch-to-js-prompt}))

(defn ^:devtools focus-console-prompt! [devtools-id]
  (verbs/automate-devtools! devtools-id {:action :focus-console-prompt}))

(defn ^:devtools clear-console-prompt! [devtools-id]
  (verbs/automate-devtools! devtools-id {:action :clear-console-prompt}))

(defn ^:devtools get-suggest-box-representation [devtools-id]
  (verbs/automate-devtools! devtools-id {:action :get-suggest-box-representation}))

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
  (verbs/automate-devtools! devtools-id {:action :get-prompt-representation}))

(defn ^:devtools print-prompt! [devtools-id]
  (go
    (let [content (<! (get-prompt-representation devtools-id))]
      (assert (string? content))
      (println content)
      content)))

(defn ^:devtools trigger-internal-error! [devtools-id & [delay]]
  (verbs/automate-devtools! devtools-id {:action :trigger-internal-error
                                         :kind   :unhandled-exception
                                         :delay  (or delay 100)}))

(defn ^:devtools trigger-internal-error-in-promise! [devtools-id & [delay]]
  (verbs/automate-devtools! devtools-id {:action :trigger-internal-error
                                         :kind   :unhandled-exception-in-promise
                                         :delay  (or delay 100)}))

(defn ^:devtools trigger-internal-error-as-error-log! [devtools-id & [delay]]
  (verbs/automate-devtools! devtools-id {:action :trigger-internal-error
                                         :kind   :error-log
                                         :delay  (or delay 100)}))

(defn ^:devtools get-frontend-url-params [devtools-id]
  (verbs/automate-devtools! devtools-id {:action :get-frontend-url-params}))

(defn ^:devtools scrape [devtools-id scraper-name & args]
  (verbs/automate-devtools! devtools-id {:action  :scrape
                                         :scraper scraper-name
                                         :args    args}))

(defn ^:devtools scrape! [devtools-id scraper-name & args]
  (go
    (let [content (<! (apply scrape devtools-id scraper-name args))]
      (println (str content))
      content)))

(defn ^:devtools simulate-console-input! [devtools-id input]
  {:pre [(string? input)]}
  (verbs/automate-devtools! devtools-id {:action :dispatch-console-prompt-input
                                         :input  input}))

(defn ^:devtools simulate-console-action! [devtools-id action]
  {:pre [(string? action)]}
  (verbs/automate-devtools! devtools-id {:action :dispatch-console-prompt-action
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
  (verbs/automate-devtools! devtools-id {:action :enable-console-feedback}))

(defn ^:devtools disable-console-feedback! [devtools-id]
  (verbs/automate-devtools! devtools-id {:action :disable-console-feedback}))

(defn ^:devtools switch-to-console-panel! [devtools-id]
  (switch-devtools-panel! devtools-id :console))
