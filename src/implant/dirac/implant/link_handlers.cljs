(ns dirac.implant.link-handlers
  (:require [dirac.implant.intercom :as intercom]
            [dirac.implant.logging :refer [error info log warn]]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]
            [oops.core :refer [gcall! gget gset! oapply ocall ocall! oget oset! oset!+]]))

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

(defn go-open-via-nrepl! [url line column]
  (go
    (if (intercom/repl-ready?)
      (let [payload {:url url :line (inc line) :column column}                                                                ; devtools line numbers are 0-based
            response (<! (intercom/go-send-devtools-request! :reveal-url payload))
            result (:result response)]
        (when (some? result)
          (error (make-open-request-error-message result url))))
      (warn (make-repl-readiness-warning-message url)))))

(defn handle-open-via-nrepl-link! [all-actions url line column event]
  ; note that event is nil when selecting exact item from link context menu (after right-click)
  ; otherwise the event represent click event of link left-click
  (let [next-action (second all-actions)]
    (when (or (nil? event) (should-call-dirac-action? event))
      (go-open-via-nrepl! url line column))
    (when (and (some? next-action) (some? event) (should-call-original-action? event))
      (ocall! next-action "handler"))))

(defn register-open-via-nrepl-handler! []
  (gcall! "dirac.registerDiracLinkAction" #js {:title   "Reveal via nREPL"
                                               :handler handle-open-via-nrepl-link!}))

; -- installation -----------------------------------------------------------------------------------------------------------

(defn install! []
  (register-open-via-nrepl-handler!))
