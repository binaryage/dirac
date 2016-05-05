(ns dirac.implant.eval
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [cljs.core.async.impl.protocols :as core-async]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log warn error]]
            [dirac.implant.feedback-support :as feedback]))

; -- configuration ----------------------------------------------------------------------------------------------------------

(defonce default-config
  {:install-check-total-time-limit              5000
   :install-check-next-trial-waiting-time       500
   :install-check-eval-time-limit               300
   :context-availablity-total-time-limit        3000
   :context-availablity-next-trial-waiting-time 10
   :eval-time-limit                             10000
   :update-banner-fn                            nil
   :display-user-info-fn                        nil
   :display-user-error-fn                       nil})

(defonce current-config (atom default-config))

(defn update-config! [config]
  (swap! current-config merge config))

(defn pref [name]
  (name @current-config))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn code-as-string [code]
  (if-let [eval-fn (oget js/window "dirac" "codeAsString")]
    (eval-fn code)
    (error "dirac.codeAsString not found")))

(defn get-has-context-fn-name [context]
  (case context
    :default "hasDefaultContext"
    :current "hasCurrentContext"))

(defn get-eval-in-context-fn-name [context]
  (case context
    :default "evalInDefaultContext"
    :current "evalInCurrentContext"))

(defn get-current-time []
  (.getTime (js/Date.)))

(defn call-when-avail-or-call-timeout-fn [check-fn call-fn timeout-fn next-trial-time total-time-limit]
  (let [start-time (get-current-time)]
    (go-loop []
      (let [current-time (get-current-time)]
        (if (< (- current-time start-time) total-time-limit)
          (if (check-fn)
            (call-fn)
            (do
              (<! (timeout next-trial-time))
              (recur)))
          (timeout-fn))))))

(defn eval-with-callback!
  ([context code]
   (eval-with-callback! context code nil))
  ([context code callback]
   (let [dirac (oget js/window "dirac")
         has-context-fn-name (get-has-context-fn-name context)]
     (if-let [has-context-fn (oget dirac has-context-fn-name)]
       (let [eval-fn-name (get-eval-in-context-fn-name context)]
         (if-let [eval-fn (oget dirac eval-fn-name)]
           (call-when-avail-or-call-timeout-fn has-context-fn
                                               #(eval-fn code callback)
                                               #(error "was unable to resolve javscript context in time" context code)
                                               (pref :context-availablity-next-trial-waiting-time)
                                               (pref :context-availablity-total-time-limit))
           (throw (ex-info (str eval-fn-name " not found on window.dirac object") dirac))))
       (throw (ex-info (str has-context-fn-name " not found on window.dirac object") dirac))))))

(defn update-banner! [msg]
  (if-let [banner-fn (pref :update-banner-fn)]
    (banner-fn msg)))

(defn display-user-info! [msg]
  (if-let [info-fn (pref :display-user-info-fn)]
    (info-fn msg)))

(defn display-user-error! [msg & more]
  (error msg more)
  (if-let [error-fn (pref :display-user-error-fn)]
    (error-fn msg)))

; -- code templates ---------------------------------------------------------------------------------------------------------

(defn installation-test-template []
  (str "dirac.runtime.repl.installed_QMARK_()"))

(defn ^:dynamic output-template [job-id kind text]
  (str "dirac.runtime.repl.present_output(" job-id ", '" kind "', " (code-as-string text) ")"))

(defn ^:dynamic postprocess-template [code]
  (str "try{"
       "  dirac.runtime.repl.postprocess_successful_eval(eval(" (code-as-string code) "))"
       "} catch (e) {"
       "  dirac.runtime.repl.postprocess_unsuccessful_eval(e)"
       "}"))

(defn console-log-template [method text]
  (str "console." method "(" (code-as-string text) ")"))

; -- message templates ------------------------------------------------------------------------------------------------------

(defn ^:dynamic thrown-assert-msg [exception-details code]
  (str "postprocessed code must never throw!\n"
       exception-details
       "---------\n"
       code))

(defn ^:dynamic invalid-type-key-assert-msg []
  "postprocessed code must return a js object with type key set to \"object\"")

(defn ^:dynamic missing-value-key-assert-msg [value]
  (str "postprocessed code must return a js object with \"value\" key defined:\n"
       (pr-str value)))

(defn ^:dynamic missing-runtime-msg []
  (str "Dirac requires runtime support from the page context.\n"
       "Please <a href=\"https://github.com/binaryage/dirac#installation\">install Dirac Runtime</a> "
       "into your app and "
       "<a href=\"https://github.com/binaryage/dirac#install-dirac-runtime\">"
       "enable the :repl feature</a>."))

; -- convenient eval wrapper ------------------------------------------------------------------------------------------------

; this function never throws, returns:
;   [::exception ex] in case of internal problem
;   [::timeout time] in case of timeout
;   [value thrown? exception-details] in case of proper execution
(defn call-eval-with-timeout [context code eval-time-limit]
  (let [result-chan (chan)
        timeout-chan (timeout eval-time-limit)
        callback (fn [value thrown? exception-details]
                   (put! result-chan [value thrown? exception-details]))]
    (go
      (try
        (eval-with-callback! context code callback)
        (catch :default ex
          (put! result-chan [::exception ex])))
      (let [[result] (alts! [result-chan timeout-chan])]                                                                      ; when timeout channel closes, the result is nil
        (or result (do
                     (close! result-chan)
                     [::timeout eval-time-limit]))))))

; return with true or ::timeout
(defn wait-for-dirac-installed []
  (let [timeout-chan (timeout (pref :install-check-total-time-limit))
        installation-test-eval-time-limit (pref :install-check-eval-time-limit)
        installation-test-code (installation-test-template)
        return (fn [val]
                 (update-banner! "")
                 val)]
    (go-loop []
      (if (core-async/closed? timeout-chan)                                                                                   ; timeout might close outside of alts! we must have this test here
        (return ::timeout)
        (let [result-chan (call-eval-with-timeout :default installation-test-code installation-test-eval-time-limit)
              [[value thrown?]] (alts! [result-chan timeout-chan])]
          (cond
            (and (not thrown?) (nil? value)) (return ::timeout)
            (true? (oget value "value")) (return true)
            :else (do
                    (<! (timeout (pref :install-check-next-trial-waiting-time)))                                              ; don't DoS the VM, wait between installation tests
                    (recur))))))))

; -- simple evaluation for page-context console logging ---------------------------------------------------------------------

(defn console-info! [msg]
  (eval-with-callback! :default (console-log-template "info" msg)))

(defn console-error! [msg]
  (eval-with-callback! :default (console-log-template "error" msg)))

(defn console-warn! [msg]
  (eval-with-callback! :default (console-log-template "warn" msg)))

(defn console-log! [msg]
  (eval-with-callback! :default (console-log-template "log" msg)))

; -- serialization of evaluations -------------------------------------------------------------------------------------------

; We want to serialize all eval requests. In other words: we don't want to have two or more evaluations "in-flight".
;
; Without serialization the results could be unpredictably out of order, for example imagine we get two network requests:
; 1. print output "some warning"
; 2. eval "some code"
; And we call js/dirac.evalInCurrentContext to process both of them in quick order.
; Without serialization, the code evaluation result could appear in the console above the warning
; because of async nature of dirac.evalInCurrentContext and async nature of console API (chrome debugger protocol).
;
; Also look into implementation of process-message :eval-js, there is a deliberate delay before processing eval-js requests
; This means printing messages in tunnel have better chance to complete before a subsequent eval is executed.

(defonce eval-requests-chan (chan))

(defn start-eval-request-queue-processing-loop! []
  (go-loop []
    (if-let [[context code handler] (<! eval-requests-chan)]
      (let [call-handler (fn [args & errors]
                           (if-not (empty? errors)
                             (apply display-user-error! errors))
                           (apply handler args))
            installation-result (<! (wait-for-dirac-installed))]
        (if (= installation-result ::timeout)
          (call-handler [::timeout] (missing-runtime-msg) (installation-test-template))
          (let [eval-result (<! (call-eval-with-timeout context code (pref :eval-time-limit)))]
            (case (first eval-result)
              ::exception (call-handler [::exception] "Internal eval error" (second eval-result))
              ::timeout (call-handler [::timeout] "Evaluation timeout" code)
              (call-handler eval-result))))
        (recur))
      (log "Leaving start-eval-request-queue-processing-loop!"))))

; -- queued evaluation in context -------------------------------------------------------------------------------------------

(defn queue-eval-request! [context code handler]
  (put! eval-requests-chan [context code handler]))

(defn result-handler! [result-chan value thrown? exception-details]
  (case value
    ::exception (put! result-chan [nil true "Evaluation exception"])
    ::timeout (put! result-chan [nil true "Evaluation timeout"])
    (do
      (put! result-chan [(if value (oget value "value")) thrown? exception-details]))))

(defn eval-in-context! [context code]
  (let [result-chan (chan)]
    (queue-eval-request! context code (partial result-handler! result-chan))
    result-chan))

; -- probing of page context ------------------------------------------------------------------------------------------------

(defn is-runtime-present? []
  (go
    (let [[value] (<! (eval-in-context! :default "dirac.runtime"))]
      value)))

(defn is-runtime-repl-support-installed? []
  (go
    (let [[value] (<! (eval-in-context! :default "dirac.runtime.repl.installed_QMARK_()"))]
      value)))

(defn get-runtime-repl-api-version []
  (go
    (let [[value] (<! (eval-in-context! :default "dirac.runtime.repl.get_api_version()"))]
      (int value))))

(defn get-runtime-config []
  (go
    (let [[value] (<! (eval-in-context! :default "dirac.runtime.repl.get_effective_config()"))]
      (js->clj value :keywordize-keys true))))

(defn get-runtime-tag []
  (go
    (let [[value] (<! (eval-in-context! :default "dirac.runtime.get_tag()"))]
      (str value))))

; -- printing captured server-side output -----------------------------------------------------------------------------------

(defn present-server-side-output! [job-id kind text]
  (feedback/post! (str "present-server-side-output! " kind " > " text))
  (let [code (output-template (int job-id) kind text)]
    (eval-in-context! :default code)))

; -- fancy evaluation in currently selected context -------------------------------------------------------------------------

(defn wrap-with-postprocess-and-eval-in-current-context! [code]
  (feedback/post! (str "wrap-with-postprocess-and-eval-in-current-context!"))
  (go
    ; for result structure refer to devtools.api.postprocess_successful_eval and devtools.api.postprocess_unsuccessful_eval
    (let [wrapped-code (postprocess-template code)]
      (first (<! (eval-in-context! :current wrapped-code))))))