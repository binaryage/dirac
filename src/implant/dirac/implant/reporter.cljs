(ns dirac.implant.reporter
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.implant.feedback :as feedback]
            [dirac.utils :as utils]))

; -- handling global exceptions ---------------------------------------------------------------------------------------------

(defn devtools-exception-handler! [_message _source _lineno _colno e]
  (let [body (utils/format-error e)
        text (str "Internal Dirac Error: DevTools code has thrown an unhandled exception\n" body)]
    (ocall (oget js/window "dirac") "addConsoleMessageToMainTarget" "error" text)
    (feedback/post! text)
    false))

(defn register-global-exception-handler! []
  (oset js/window ["onerror"] devtools-exception-handler!))

; -- handling unhandled rejections in promises ------------------------------------------------------------------------------

(defn devtools-unhandled-rejection-handler! [event]
  (let [reason (oget event "reason")
        body (utils/format-error reason)
        text (str "Internal Dirac Error: DevTools code has thrown an unhandled rejection (in promise)\n" body)]
    (ocall (oget js/window "dirac") "addConsoleMessageToMainTarget" "error" text)
    (feedback/post! text)))

(defn register-unhandled-rejection-handler! []
  (.addEventListener js/window "unhandledrejection" devtools-unhandled-rejection-handler!))

; -- handling console.error -------------------------------------------------------------------------------------------------

(defonce ^:dynamic *original-console-error-fn* nil)

(defn console-error-fn [& args]
  (assert *original-console-error-fn*)
  (let [result (.apply *original-console-error-fn* js/console (into-array args))]
    (let [body (pr-str args)
          text (str "Internal Dirac Error: an error was logged into the internal DevTools console\n" body)]
      (ocall (oget js/window "dirac") "addConsoleMessageToMainTarget" "error" text)
      (feedback/post! text))
    result))

(defn register-console-error-handler! []
  (set! *original-console-error-fn* (oget js/console "error"))
  (oset js/console ["error"] console-error-fn))

; -- installation -----------------------------------------------------------------------------------------------------------

(defn install! []
  (register-global-exception-handler!)
  (register-unhandled-rejection-handler!)
  (register-console-error-handler!))
