(ns dirac.runtime.repl
  (:require [goog.object]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [clojure.browser.repl :as brepl]
            [dirac.runtime.prefs :refer [get-prefs pref]]
            [clojure.string :as string]
            [goog.labs.userAgent.browser :as ua]))

; We didn't want to introduce new protocol methods for websocket connection between DevTools front-end and back-end.
; So instead we tunnel our messages through console.log calls.
;
; If first parameter of the log message mentions our magic word, we treat the call differently:
; 1) "~~$DIRAC-MSG$~~" is for control messages
;                      these are taken outside of message processing and do not affect console model
; 2) "~~$DIRAC-LOG$~~" is for flavored version of normal log statements (they will have green cljs-ish background)
;                      we let these bubble through as real log messages but decorate them slightly for our purposes

(defn ^:dynamic available? []
  (and (ua/isChrome) (ua/isVersionOrHigher 47)))                                                                              ; Chrome 47+

(def ^:dynamic *installed?* false)

; keep in mind that we want to avoid any state at all
; javascript running this code can be reloaded anytime, same with devtools front-end

; -- tunneling messages to Dirac DevTools -----------------------------------------------------------------------------------

(defn console-tunnel [method & args]
  (.apply (oget js/console method) js/console (into-array args)))

(defn dirac-msg-args [name args]
  (concat ["~~$DIRAC-MSG$~~" name] args))

(defn dirac-log-args [request-id kind args]
  (concat ["~~$DIRAC-LOG$~~" request-id kind] args))

(defn call-dirac [name & args]
  (apply console-tunnel "log" (dirac-msg-args name args)))

(defn log [request-id kind & args]
  (apply console-tunnel "log" (dirac-log-args request-id kind args)))

(defn warn [request-id kind & args]
  (apply console-tunnel "warn" (dirac-log-args request-id kind args)))

(defn error [request-id kind & args]
  (apply console-tunnel "error" (dirac-log-args request-id kind args)))

(defn group* [collapsed? request-id kind & args]
  (apply console-tunnel (if collapsed? "groupCollapsed" "group") (dirac-log-args request-id kind args)))

(defn group-collapsed [& args]
  (apply group* true args))

(defn group [& args]
  (apply group* false args))

(defn group-end []
  (.groupEnd js/console))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn detect-and-strip [prefix text]
  (let [prefix-len (count prefix)
        s (subs text 0 prefix-len)]
    (if (= s prefix)
      (string/triml (subs text prefix-len)))))

(defn get-whitespace-prefix-length [line]
  (if-let [m (re-find #"^([ ]+)" line)]
    (count (second m))
    0))

(defn remove-common-whitespace-prefix [text]
  (let [text-with-spaces (string/replace text "\t" "  ")                                                                      ; we don't want to run into mixed tabs-spaces situation, treat all tabs as 2-spaces
        lines (string/split text-with-spaces #"\n")
        common-prefix-length (apply min (map get-whitespace-prefix-length lines))]
    (if (pos? common-prefix-length)
      (string/join "\n" (map #(subs % common-prefix-length) lines))
      text)))

(defn present-java-trace [request-id text]
  (let [lines (string/split text #"\n")
        first-line (first lines)
        rest-content (string/join "\n" (rest lines))]
    (if (empty? rest-content)
      (error request-id :stderr first-line)
      (do
        (group-collapsed request-id :stderr "%c%s" (pref :java-trace-header-style) first-line)
        (log request-id :stderr (remove-common-whitespace-prefix rest-content))
        (group-end)))))

; -- REPL API ---------------------------------------------------------------------------------------------------------------

(def api-version 3)                                                                                                           ; version of REPL API

(defn ^:export get-api-version []
  api-version)

(defn ^:export get-effective-config []
  (clj->js (get-prefs)))

(defn ^:export present-repl-result
  "Called by our nREPL boilerplate when we capture REPL evaluation result."
  [request-id value]
  (log request-id "result" value)
  value)

(defn ^:export present-repl-exception
  "Called by our nREPL boilerplate when we capture REPL evaluation exception."
  [request-id exception]
  (error request-id "exception" exception))

(defn ^:export present-output [request-id kind text]
  (case kind
    "java-trace" (present-java-trace request-id text)
    (if-let [warning-msg (detect-and-strip "WARNING:" text)]
      (warn request-id "warning" warning-msg)
      (if-let [error-msg (detect-and-strip "ERROR:" text)]
        (error request-id "error" error-msg)
        (log request-id kind text)))))

(defn ^:export postprocess-successful-eval
  "This is a postprocessing function wrapping weasel javascript evaluation attempt.
  This structure is needed for building response to nREPL server (see dirac.implant.weasel in Dirac project)
  In our case weasel is running in the context of Dirac DevTools and could potentially have different version of cljs runtime.
  To be correct we have to do this post-processing in app's context to use the same cljs runtime as app evaluating the code.

  Also we have to be careful to not enter into infinite printing with cyclic data structures.
  We limit printing level and length."
  [value]
  (binding [*print-level* (pref :dirac-print-level)
            *print-length* (pref :dirac-print-length)]
    #js {:status "success"
         :value  (str value)}))

(defn ^:export postprocess-unsuccessful-eval [ex]
  "Same as postprocess-successful-eval but prepares response for evaluation attempt with exception."
  #js {:status     "exception"
       :value      (pr-str ex)
       :stacktrace (if (.hasOwnProperty ex "stack")
                     (.-stack ex)
                     "No stacktrace available.")})

; -- install/uninstall ------------------------------------------------------------------------------------------------------

(defn installed? []
  *installed?*)

(defn install! []
  (when (and (not (installed?)) (available?))
    (brepl/bootstrap)
    (set! *installed?* true)
    true))

(defn uninstall! []
  (when (installed?)
    (set! *installed?* false)))