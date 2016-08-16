(ns dirac.implant.reporter
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.utils :as utils]))

; -- handling global exceptions ---------------------------------------------------------------------------------------------

(defn devtools-exception-handler! [_message _source _lineno _colno e]
  (let [text (str "Internal Dirac Error: DevTools code has thrown an unhandled exception\n" (utils/format-error e))]
    (ocall (oget js/window "dirac") "addConsoleMessageToMainTarget" "error" text)
    false))

(defn register-global-exception-handler! []
  (oset js/window ["onerror"] devtools-exception-handler!))

; -- handling unhandled rejections in promises ------------------------------------------------------------------------------

(defn devtools-unhandled-rejection-handler! [event]
  (let [reason (oget event "reason")
        text (str "Internal Dirac Error: DevTools code has thrown an unhandled rejection (in promise)\n"
                  (utils/format-error reason))]
    (ocall (oget js/window "dirac") "addConsoleMessageToMainTarget" "error" text)))

(defn register-unhandled-rejection-handler! []
  (.addEventListener js/window "unhandledrejection" devtools-unhandled-rejection-handler!))

; -- installation -----------------------------------------------------------------------------------------------------------

(defn install! []
  (register-global-exception-handler!)
  (register-unhandled-rejection-handler!))
