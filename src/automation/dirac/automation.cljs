(ns dirac.automation
  "High-level automation API to be used from browser tests.

  All functions here should be called within `go-task` body.
  To open a new devtools instance use `open-devtools!` or a convenience macro `with-devtools`.
  Functions which have meta {:devtools true} can be called within `with-devtools` body with omitted devtools-id or you
  can pass a specific devtools-id returned from `open-devtools!`.

  Other functions do not target a specific devtools instance and can be called independently.
  "
  (:require [clojure.string :as string]
            [dirac.automation.helpers :as helpers]
            [dirac.automation.logging :refer [error log]]
            [dirac.automation.machinery :as machinery]
            [dirac.automation.messages :as messages]
            [dirac.automation.notifications :as notifications]
            [dirac.automation.options :as options]
            [dirac.automation.runner :as runner]
            [dirac.automation.task]
            [dirac.automation.verbs :as verbs]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]                                                                                           ; required for macros!
            [dirac.shared.utils :as utils]
            [oops.core :refer [oapply ocall oget oset!]]))

; -- automation actions -----------------------------------------------------------------------------------------------------

(defn go-pause! []
  (runner/go-wait-for-resume!))

(defn go-wait-for-resume! []
  (runner/go-wait-for-resume!))

(defn go-set-options! [options]
  (messages/go-set-options! options))

(defn go-store-options! []
  (options/go-store-options!))

(defn go-restore-options! []
  (options/go-restore-options!))

(defn go-open-scenario! [name & [params]]
  (go
    (let [scenario-id-or-error (<! (messages/go-post-message! #js {:type "marion-open-scenario"
                                                                   :url  (helpers/get-scenario-url name params)}))]
      (if (string/starts-with? scenario-id-or-error "error")
        (let [error-msg (str "Unable to open scenario '" name "' due to " scenario-id-or-error)]
          (error error-msg)
          (throw error-msg {}))
        scenario-id-or-error))))

(defn go-close-scenario! [scenario-id]
  (messages/go-post-message! #js {:type        "marion-close-scenario"
                                  :scenario-id scenario-id}))

(defn go-activate-scenario! [scenario-id]
  (messages/go-post-message! #js {:type        "marion-activate-scenario"
                                  :scenario-id scenario-id}))

(defn go-trigger! [trigger-name & args]
  (notifications/go-broadcast-notification! {:trigger trigger-name
                                             :args    args}))

(defn go-wait-for-match [what & args]
  (apply verbs/go-wait-for-match what args))

(defn go-open-devtools! [& [extra-url-params]]
  (go
    ; some previous tests or user interaction in dev mode might steal focus from scenario tab => restore focus here
    (when-some [current-scenario-id (machinery/get-current-scenario-id)]
      (<! (go-activate-scenario! current-scenario-id)))
    ; note that open-dirac-devtools operates on the last active tab, hence the focus restoration above
    (let [synthetic-event ["open-dirac-devtools" {:reset-settings   1
                                                  :extra-url-params extra-url-params}]
          open-devtools-event [:chromex.ext.commands/on-command synthetic-event]
          devtools-id (<! (messages/go-fire-chrome-event! open-devtools-event))]
      (<! (verbs/go-wait-for-devtools-boot devtools-id))
      (machinery/push-devtools-id-to-stack! devtools-id)
      (machinery/make-devtools-id-wrapper devtools-id))))                                                                     ; note: we wrap it so we can easily auto-fill devtools-id parameters in action! method

(defn go-wait-for-devtools-ui [& [delay]]
  ; sometimes we have to give devtools UI some time to update
  (go-wait (or delay 1000)))                                                                                                  ; TODO: should not be hard-coded FLAKY!

; -- devtools-instance targeting actions ------------------------------------------------------------------------------------

(defn ^:devtools go-close-devtools! [devtools-id]
  (go
    (<! (messages/go-fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" devtools-id]]))
    (<! (verbs/wait-for-devtools-unregistration devtools-id))
    (machinery/remove-devtools-id-from-stack! devtools-id)))

(defn ^:devtools go-wait-for-devtools-match [devtools-id what & args]
  (apply verbs/go-wait-for-devtools-match devtools-id what args))

(defn ^:devtools go-wait-for-prompt-to-enter-edit-mode [devtools-id]
  (go-wait-for-devtools-match devtools-id "setDiracPromptMode('edit')"))

(defn ^:devtools go-wait-for-prompt-switch-to-dirac [devtools-id]
  (go-wait-for-devtools-match devtools-id "switched console prompt to 'dirac'"))

(defn ^:devtools go-wait-for-prompt-switch-to-js [devtools-id]
  (go-wait-for-devtools-match devtools-id "switched console prompt to 'js'"))

(defn ^:devtools go-switch-devtools-panel! [devtools-id panel]
  (go
    (<! (verbs/go-automate-devtools! devtools-id {:action :switch-inspector-panel
                                                  :panel  panel}))
    (<! (verbs/go-wait-for-panel-switch devtools-id (name panel)))))

(defn ^:devtools go-wait-for-panel-switch [devtools-id panel]
  (verbs/go-wait-for-panel-switch devtools-id (name panel)))

(defn ^:devtools go-switch-prompt-to-dirac! [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :switch-to-dirac-prompt}))

(defn ^:devtools go-switch-prompt-to-javascript! [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :switch-to-js-prompt}))

(defn ^:devtools go-focus-console-prompt! [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :focus-console-prompt}))

(defn ^:devtools go-focus-best-console-prompt! [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :focus-best-console-prompt}))

(defn ^:devtools go-clear-console-prompt! [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :clear-console-prompt}))

(defn ^:devtools go-get-suggest-box-representation [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :get-suggest-box-representation}))

(defn ^:devtools go-print-suggest-box! [devtools-id]
  (go
    (let [text-representation (<! (go-get-suggest-box-representation devtools-id))]
      (assert (string? text-representation))
      (println text-representation))))

(defn ^:devtools go-get-suggest-box-item-count [devtools-id]
  (go
    (let [text-representation (<! (go-get-suggest-box-representation devtools-id))]
      (assert (string? text-representation))
      (when-some [m (re-find #"suggest box displays ([0-9]*?) items" text-representation)]
        (utils/parse-int (second m))))))

(defn ^:devtools go-get-prompt-representation [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :get-prompt-representation}))

(defn ^:devtools go-print-prompt! [devtools-id]
  (go
    (<! (go-wait 500))                                                                                                        ; TODO: should not be hard-coded FLAKY!
    (let [content (<! (go-get-prompt-representation devtools-id))]
      (assert (string? content))
      (println content)
      content)))

(defn ^:devtools go-trigger-internal-error! [devtools-id & [delay]]
  (verbs/go-automate-devtools! devtools-id {:action :trigger-internal-error
                                            :kind   :unhandled-exception
                                            :delay  (or delay 100)}))

(defn ^:devtools go-trigger-internal-error-in-promise! [devtools-id & [delay]]
  (verbs/go-automate-devtools! devtools-id {:action :trigger-internal-error
                                            :kind   :unhandled-exception-in-promise
                                            :delay  (or delay 100)}))

(defn ^:devtools go-trigger-internal-error-as-error-log! [devtools-id & [delay]]
  (verbs/go-automate-devtools! devtools-id {:action :trigger-internal-error
                                            :kind   :error-log
                                            :delay  (or delay 100)}))

(defn ^:devtools go-get-frontend-url-params [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :get-frontend-url-params}))

(defn ^:devtools go-scrape [devtools-id scraper-name & args]
  (go
    (<! (go-wait 500))                                                                                                        ; TODO: should not be hard-coded FLAKY!
    (<! (verbs/go-automate-devtools! devtools-id {:action  :scrape
                                                  :scraper scraper-name
                                                  :args    args}))))

(defn ^:devtools go-scrape! [devtools-id scraper-name & args]
  (go
    (let [content (<! (apply go-scrape devtools-id scraper-name args))]
      (println (str content))
      content)))

(defn ^:devtools go-simulate-console-input! [devtools-id input]
  {:pre [(string? input)]}
  (verbs/go-automate-devtools! devtools-id {:action :dispatch-console-prompt-input
                                            :input  input}))

(defn ^:devtools go-simulate-console-action! [devtools-id action]
  {:pre [(string? action)]}
  (verbs/go-automate-devtools! devtools-id {:action :dispatch-console-prompt-action
                                            :input  action}))

(defn ^:devtools go-simulate-global-action! [devtools-id action]
  {:pre [(string? action)]}
  (verbs/go-automate-devtools! devtools-id {:action :dispatch-global-action
                                            :input  action}))

(defn ^:devtools go-type-in-console! [devtools-id input]
  (go
    (<! (go-focus-console-prompt! devtools-id))
    (<! (go-clear-console-prompt! devtools-id))
    (<! (go-simulate-console-input! devtools-id input))
    (<! (go-simulate-console-action! devtools-id "enter"))))

(defn ^:devtools go-wait-for-repl-job-match-in-console! [devtools-id match-or-matches]
  (let [matches (if (coll? match-or-matches)
                  match-or-matches
                  [match-or-matches])]
    (go
      (doseq [match matches]
        (<! (go-wait-for-devtools-match devtools-id match)))
      (<! (go-wait-for-devtools-match devtools-id "repl eval job ended"))
      (<! (go-wait 100)))))                                                                                                   ; this timeout is a hack, for some reason feedback from following commands came before

(defn ^:devtools go-exec-and-match-in-console! [devtools-id input match-or-matches]
  (go
    (<! (go-type-in-console! devtools-id input))
    (<! (go-wait-for-repl-job-match-in-console! devtools-id match-or-matches))))

(defn ^:devtools go-enable-console-feedback! [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :enable-console-feedback}))

(defn ^:devtools go-disable-console-feedback! [devtools-id]
  (verbs/go-automate-devtools! devtools-id {:action :disable-console-feedback}))

(defn ^:devtools go-switch-to-console-panel! [devtools-id]
  (go-switch-devtools-panel! devtools-id :console))

(defn ^:devtools go-count-internal-dirac-errors [devtools-id]
  (go
    (count (<! (go-scrape devtools-id :find-logs "Internal Dirac Error")))))

(defn ^:devtools go-reload! []
  (go
    ; the timeouts are here to prevent "Cannot find context with specified id" V8 errors ?
    (<! (go-wait 3000))                                                                                                       ; TODO: should not be hard-coded FLAKY!
    (<! (go-trigger! :reload))
    (<! (go-wait 3000))))                                                                                                     ; TODO: should not be hard-coded FLAKY!
