(ns dirac.runtime.repl
  (:require [dirac.runtime.prefs :refer [get-prefs pref]]
            [dirac.runtime.bootstrap :refer [bootstrap!]]
            [dirac.runtime.output :as output]
            [dirac.runtime.deps]
            [clojure.string :as string]
            [goog.object :as gobject]
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
(def ^:dynamic *bootstrapped?* false)

; keep in mind that we want to avoid any state at all
; javascript running this code can be reloaded anytime, same with devtools front-end

; -- tunneling messages to Dirac DevTools -----------------------------------------------------------------------------------

(defn console-tunnel [method & args]
  (.apply (gobject/get js/console method) js/console (to-array args)))

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

(defn should-silence-warning? [message]
  (cond
    (and (pref :silence-use-of-undeclared-var-warnings) (re-find #"^Use of undeclared Var" message)) true
    (and (pref :silence-no-such-namespace-warnings) (re-find #"^No such namespace" message)) true
    :else false))

(defn should-silence-error? [_message]
  (cond
    :else false))

(defn emit-warning! [request-id message]
  (when-not (should-silence-warning? message)
    (warn request-id "warning" message)))

(defn emit-error! [request-id message]
  (when-not (should-silence-error? message)
    (error request-id "error" message)))

(defn formatted-log [request-id kind format text]
  (if-not (and (= format "rich-text") (pref :rich-text-enabled))
    (log request-id kind text)
    (let [soup (output/boil-rich-text text)]
      (apply log request-id kind soup))))

(defn with-safe-printing [f]
  (binding [cljs.core/*print-level* (pref :safe-print-level)
            cljs.core/*print-length* (pref :safe-print-length)]
    (f)))

(defn safe-pr-str [v]
  (with-safe-printing (fn [] (pr-str v))))

; -- REPL API ---------------------------------------------------------------------------------------------------------------

(def api-version 7)                                                                                                           ; current version of our REPL API

(defn ^:export get-api-version []
  api-version)

(defn ^:export get-effective-config []
  (clj->js (get-prefs)))

(defn ^:export present-repl-result
  "Called by our nREPL boilerplate when we capture a REPL evaluation result."
  [request-id value]
  (log request-id "result" value)
  value)

(defn ^:export present-repl-exception
  "Called by our nREPL boilerplate when we capture a REPL evaluation exception."
  [request-id exception]
  (error request-id "exception" exception))

(defn ^:export present-output [request-id kind format text]
  (case kind
    "java-trace" (present-java-trace request-id text)
    (if-let [warning-msg (detect-and-strip "WARNING:" text)]
      (emit-warning! request-id warning-msg)
      (if-let [error-msg (detect-and-strip "ERROR:" text)]
        (emit-error! request-id error-msg)
        (formatted-log request-id kind format text)))))

(defn ^:export bootstrapped? []
  *bootstrapped?*)

(defn ^:export capture-output
  "A printing wrapper responsible for capturing printed output and presenting it via `present-output`."
  [job-id f]
  ; we want to redirect all side-effect printing, so it can be presented in the Dirac REPL console
  (binding [cljs.core/*print-newline* false
            cljs.core/*print-fn* (partial present-output job-id "stdout" "plain-text")
            cljs.core/*print-err-fn* (partial present-output job-id "stderr" "plain-text")]
    (f)))

(defn ^:export present
  "A presentation wrapper which takes care of presenting REPL evaluation to Dirac user.
  We short-circuit nREPL feedback mechanism and display REPL results immediatelly to the user as native data.
  This especially important for cljs-devtools.

  Please note that for traditional nREPL clients we still serialize the result, send it over the wire to nREPL server and
  in turn that result is sent back to a client and presented. The Dirac client has just special logic and ignores this echoed
  output because it was already presented directly.

  See https://github.com/binaryage/dirac/blob/master/docs/about-repls.md for conceptual overview."
  [job-id job-fn]
  (try
    (present-repl-result job-id (capture-output job-id job-fn))
    (catch :default e
      (present-repl-exception job-id e)
      (throw e))))

(defn ^:export execute-job
  "Execute a REPL job by optionally wrapping it in a requested wrapper."
  [job-id wrap-mode job-fn]
  (case wrap-mode
    "wrap" (present job-id job-fn)
    (job-fn)))

(defn ^:export eval-captured
  "Evaluates a REPL job in the captured mode. Compare it to eval-special.
  Captured mode keeps track of *1 *2 *3 and *e REPL specials."
  [job-id wrap-mode job-fn]
  (try
    (let [result (execute-job job-id wrap-mode job-fn)]
      (set! *3 *2)
      (set! *2 *1)
      (set! *1 result)
      (safe-pr-str result))
    (catch :default e
      (set! *e e)
      (throw e))))

(defn ^:export eval-special
  "Evaluates a REPL job in the special mode. Compare it to eval-captured."
  [job-id wrap-mode job-fn]
  (let [result (execute-job job-id wrap-mode job-fn)]
    (safe-pr-str result)))

(defn ^:export postprocess-successful-eval
  "This is a postprocessing function wrapping Weasel's Javascript evaluation attempt.
  This structure is needed for building response to nREPL server (see dirac.implant.weasel in Dirac project)
  In our case weasel is running in the context of Dirac DevTools and could potentially have different version of cljs runtime.
  To be correct we have to do this post-processing in app's context to use the same cljs runtime as app evaluating the code.

  Also we have to be careful to not enter into infinite printing with cyclic data structures.
  We limit printing level and length via with-safe-printing."
  [value]
  (with-safe-printing (fn [] #js {:status "success"
                                  :value  (str value)})))

(defn ^:export postprocess-unsuccessful-eval [ex]
  "Same as postprocess-successful-eval but prepares response of evaluation attempt with an exception."
  (with-safe-printing (fn [] #js {:status     "exception"
                                  :value      (pr-str ex)
                                  :stacktrace (if (.hasOwnProperty ex "stack")
                                                (aget ex "stack")
                                                "No stacktrace available.")})))

(defn ^:export eval
  "This is the main entrypoint for evaluation of a snippet of code in the context of REPL.
   Please note that this code runs in the context of the app and uses ClojureScript runtime built together with the app.

    job-id    - a numeric id of the REPL job
    eval-mode - 'captured' or 'special'
    wrap-mode - 'wrap' or nil
    job-fn    - code to be executed in the form of function

  Note that normally we want to support capturing REPL specials *1 *2 *3 and *e. Only when we are executing their retrieval
  we don't want to capture them and we want to use the 'special' path.

  Also normally we want to wrap our code in a supporting wrapper which will present results directly via cljs-devtools,
  or present exceptions in a friendly way. Also we want to capture any printing which might occur during evaluation.
  In some special cases we might not want to do that.

  Finally we want to postprocess evaluation result and prepare Weasel's nREPL response.

  See https://github.com/binaryage/dirac/blob/master/docs/about-repls.md for conceptual overview."
  [job-id eval-mode wrap-mode job-fn]
  (let [eval-fn (case eval-mode
                  "special" eval-special
                  "captured" eval-captured)]
    (try
      (postprocess-successful-eval (eval-fn job-id wrap-mode job-fn))
      (catch :default e
        (postprocess-unsuccessful-eval e)))))

(defn ^:export request-eval-cljs
  "Automates Dirac REPL from the app. This way you can request evaluation of ClojureScript code as it would be entered
  directly by the user."
  [code]
  (assert (string? code) "Code passed for evaluation must be a string")
  (call-dirac "eval-cljs" code))

(defn ^:export request-eval-js
  "Automates Dirac REPL from the app. This way you can request evaluation of Javascript code as it would be entered
  directly by the user."
  [code]
  (assert (string? code) "Code passed for evaluation must be a string")
  (call-dirac "eval-js" code))

; -- install/uninstall ------------------------------------------------------------------------------------------------------

(defn ^:export installed? []
  *installed?*)

(defn ^:export install! []
  (when (not (installed?))
    (bootstrap! #(set! *bootstrapped?* true))
    (set! *installed?* true)
    true))

(defn ^:export uninstall! []
  (when (installed?)
    (set! *installed?* false)))

