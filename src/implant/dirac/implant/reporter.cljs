(ns dirac.implant.reporter
  (:require [clojure.string :as string]
            [cuerdas.core :as cuerdas]
            [chromex.logging :refer-macros [log warn error group group-end]]
            [oops.core :refer [oget oset! ocall oapply]]
            [dirac.implant.feedback :as feedback]
            [dirac.implant.info :as info]
            [dirac.utils :as utils]
            [dirac.implant.options :as options]))

(def issues-url "https://github.com/binaryage/dirac/issues")

(defn report-internal-error! [kind body]
  {:pre [(string? kind)
         (string? body)]}
  (let [trimmed-body (string/trim body)
        first-body-line (first (cuerdas/lines trimmed-body))
        header #js ["%cInternal Dirac Error%c%s"
                    "background-color:red;color:white;font-weight:bold;padding:0px 3px;border-radius:2px;"
                    "color:red"
                    (str " " (if (empty? first-body-line) "(no details)" first-body-line))]
        details (str (info/get-info-line) "\n\n"
                     kind ":\n"
                     (if (empty? trimmed-body) "(no details)" trimmed-body)
                     "\n\n"
                     "---\n"
                     "Please report the issue here: " issues-url)]
    (feedback/post! details)
    (let [dirac-api (oget js/window "dirac")]
      (assert dirac-api)
      (ocall dirac-api "addConsoleMessageToMainTarget" "startGroupCollapsed" "log" nil header)
      (ocall dirac-api "addConsoleMessageToMainTarget" "log" "log" details)
      (ocall dirac-api "addConsoleMessageToMainTarget" "endGroup" "log"))))

; -- handling global exceptions ---------------------------------------------------------------------------------------------

(defn devtools-exception-handler! [_message _source _lineno _colno e]
  (let [kind "DevTools code has thrown an unhandled exception"
        body (utils/format-error e)]
    (report-internal-error! kind body)
    false))

(defn register-global-exception-handler! []
  (oset! js/window "onerror" devtools-exception-handler!))

; -- handling unhandled rejections in promises ------------------------------------------------------------------------------

(defn devtools-unhandled-rejection-handler! [event]
  (let [kind "DevTools code has thrown an unhandled rejection (in promise)"
        body (utils/format-error (oget event "?reason"))]
    (report-internal-error! kind body)
    false))

(defn register-unhandled-rejection-handler! []
  (.addEventListener js/window "unhandledrejection" devtools-unhandled-rejection-handler!))

; -- handling console.error -------------------------------------------------------------------------------------------------

(defonce ^:dynamic *original-console-error-fn* nil)

(defn console-error-fn [& args]
  (assert *original-console-error-fn*)
  (let [result (.apply *original-console-error-fn* js/console (into-array args))
        kind "An error was logged into the internal DevTools console"
        first-arg (first args)
        first-item (if (and (string? first-arg)
                            (not (empty? first-arg)))
                     first-arg)
        rest-items (if (some? first-item)
                     (rest args)
                     args)
        decorated-rest-items (map #(str "  * " %) rest-items)
        all-items (remove empty? (concat [first-item] decorated-rest-items))
        body (cuerdas/unlines all-items)]
    (report-internal-error! kind body)
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
