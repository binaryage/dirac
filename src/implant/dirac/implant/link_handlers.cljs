(ns dirac.implant.link-handlers
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [oops.core :refer [gset! oget oset! oset!+ ocall! ocall oapply gget gcall!]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.implant.intercom :as intercom]))

(defn ^:dynamic make-open-request-error-message [error url]
  (str "A request to reveal a link reported an error: " error "\n"
       "The url requested to be revealed was: " url "\n"
       "Please inspect your nREPL server terminal output for more details."))

(defn ^:dynamic make-repl-readiness-warning-message [url]
  (str "Cannot reveal a link via nREPL. REPL connection is not ready.\n"
       "The url requested to be revealed was: " url "\n"
       "Please connect to nREPL server in DevTools console first."))

; -- reveal-url -------------------------------------------------------------------------------------------------------------

(defn should-call-dirac-action? [event]
  (not (ocall event "getModifierState" "Meta")))

(defn should-call-original-action? [event]
  (not (ocall event "getModifierState" "Alt")))

(defn open-via-nrepl! [url line column]
  (if (intercom/repl-ready?)
    (go
      (let [payload {:url url :line (inc line) :column column}                                                                ; devtools line numbers are 0-based
            response (<! (intercom/send-devtools-request! :reveal-url payload))
            result (:result response)]
        (if (some? result)
          (error (make-open-request-error-message result url)))))
    (warn (make-repl-readiness-warning-message url))))

(defn open-via-nrepl-link-handler [all-actions url line column event]
  ; note that event is nil when selecting exact item from link context menu (after right-click)
  ; otherwise the event represent click event of link left-click
  (let [next-action (second all-actions)]
    (if (or (nil? event) (should-call-dirac-action? event))
      (open-via-nrepl! url line column))
    (if (and (some? next-action) (some? event) (should-call-original-action? event))
      (ocall! next-action "handler"))))

(defn register-open-via-nrepl-handler! []
  (gcall! "dirac.registerDiracLinkAction" #js {:title   "Reveal via nREPL"
                                               :handler open-via-nrepl-link-handler}))

; -- installation -----------------------------------------------------------------------------------------------------------

(defn install! []
  (register-open-via-nrepl-handler!))
