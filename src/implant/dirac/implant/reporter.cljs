(ns dirac.implant.reporter
  (:require [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.implant.feedback :as feedback]
            [dirac.implant.info :as info]
            [dirac.utils :as utils]
            [dirac.implant.options :as options]))

(defn report! [header body]
  {:pre [(string? header)
         (string? body)]}
  (let [text (str header "\n"
                  (info/get-info-line) "\n"
                  body)]
    (ocall (oget js/window "dirac") "addConsoleMessageToMainTarget" "error" text)
    (feedback/post! text)))

; -- handling global exceptions ---------------------------------------------------------------------------------------------

(defn devtools-exception-handler! [_message _source _lineno _colno e]
  (let [header "Internal Dirac Error: DevTools code has thrown an unhandled exception"
        body (utils/format-error e)]
    (report! header body)
    false))

(defn register-global-exception-handler! []
  (oset! js/window "onerror" devtools-exception-handler!))

; -- handling unhandled rejections in promises ------------------------------------------------------------------------------

(defn devtools-unhandled-rejection-handler! [event]
  (let [header "Internal Dirac Error: DevTools code has thrown an unhandled rejection (in promise)"
        body (utils/format-error (oget event "?reason"))]
    (report! header body)
    false))

(defn register-unhandled-rejection-handler! []
  (.addEventListener js/window "unhandledrejection" devtools-unhandled-rejection-handler!))

; -- handling console.error -------------------------------------------------------------------------------------------------

(defonce ^:dynamic *original-console-error-fn* nil)

(defn console-error-fn [& args]
  (assert *original-console-error-fn*)
  (let [result (.apply *original-console-error-fn* js/console (into-array args))
        header "Internal Dirac Error: an error was logged into the internal DevTools console"
        body (pr-str args)]
    (report! header body)
    result))

(defn register-console-error-handler! []
  (set! *original-console-error-fn* (oget js/console "error"))
  (oset! js/console "error" console-error-fn))

; -- installation -----------------------------------------------------------------------------------------------------------

(defn install! []
  (when-not (options/should-disable-reporter?)
    (register-global-exception-handler!)
    (register-unhandled-rejection-handler!)
    (register-console-error-handler!)))
