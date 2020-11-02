(ns dirac.implant.reporter
  (:require [clojure.string :as string]
            [cuerdas.core :as cuerdas]
            [dirac.implant.feedback :as feedback]
            [dirac.implant.info :as info]
            [dirac.implant.logging :refer [error log warn]]
            [dirac.implant.options :as options]
            [dirac.implant.helpers :refer [get-dirac-angel]]
            [dirac.shared.utils :as utils]
            [oops.core :refer [gget gset! oapply ocall oget oset!]]))

(def issues-url "https://github.com/binaryage/dirac/issues")

(defn format-error-header [title body]
  (let [title-line (or title (string/trim (first (cuerdas/lines body))))]
    (if (empty? title-line)
      "(no details)"
      title-line)))

(defn report-internal-error! [kind body & [title]]
  {:pre [(string? kind)
         (string? body)]}
  (let [header #js ["%cInternal Dirac Error%c%s"
                    "background-color:red;color:white;font-weight:bold;padding:0px 3px;border-radius:2px;"
                    "color:red"
                    (str " " (format-error-header title body))]
        details (str (info/get-info-line) "\n"
                     "\n"
                     kind ":\n"
                     body "\n"
                     "---\n"
                     "To inspect the problem in internal DevTools => https://goo.gl/0FkZ1o\n"
                     "Consider reporting the issue here: " issues-url)]
    (feedback/post! details)
    (let [dirac-angel (get-dirac-angel)]
      (assert dirac-angel)
      (ocall dirac-angel "addConsoleMessageToMainTarget" "startGroupCollapsed" "info" nil header)
      (ocall dirac-angel "addConsoleMessageToMainTarget" "log" "info" details)
      (ocall dirac-angel "addConsoleMessageToMainTarget" "endGroup" "info"))))

; -- handling global exceptions ---------------------------------------------------------------------------------------------

(defn devtools-exception-handler! [_message _source _lineno _colno e]
  (let [kind "DevTools code has thrown an unhandled exception"
        body (utils/format-error e)]
    (report-internal-error! kind body)
    false))

(defn register-global-exception-handler! []
  (gset! "onerror" devtools-exception-handler!))

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
(def console-error-body-prefix "  | ")

(defn format-console-error-body [args]
  (let [text (string/join " " args)
        lines (cuerdas/lines text)
        indented-lines (map (partial str console-error-body-prefix) lines)]
    (cuerdas/unlines indented-lines)))

(defn console-error-fn [& args]
  (assert *original-console-error-fn*)
  (let [result (.apply *original-console-error-fn* js/console (into-array args))
        kind "An error was logged into the internal DevTools console"
        body (format-console-error-body args)
        title (first (cuerdas/lines (first args)))]
    (report-internal-error! kind body title)
    result))

(defn register-console-error-handler! []
  (set! *original-console-error-fn* (gget "console.error"))
  (gset! "console.error" console-error-fn))

; -- installation -----------------------------------------------------------------------------------------------------------

(defn install! []
  (when-not (options/should-disable-reporter?)
    (register-global-exception-handler!)
    (register-unhandled-rejection-handler!)
    (register-console-error-handler!)))
