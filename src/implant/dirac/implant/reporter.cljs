(ns dirac.implant.reporter
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [dirac.utils :as utils]))

; -- handling exceptions ----------------------------------------------------------------------------------------------------

(defn devtools-exception-handler! [_message _source _lineno _colno e]
  (let [text (str "Internal Dirac Error: DevTools code has thrown an unhandled exception\n" (utils/format-error e))]
    (ocall (oget js/window "dirac") "addConsoleMessageToMainTarget" "error" text)
    false))

(defn register-global-exception-handler! []
  (oset js/window ["onerror"] devtools-exception-handler!))

(defn install! []
  (register-global-exception-handler!))
