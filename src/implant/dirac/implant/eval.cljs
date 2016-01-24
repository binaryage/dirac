(ns dirac.implant.eval
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [cljs.core.async.impl.protocols :as core-async]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log warn error]]))

; -- configuration ----------------------------------------------------------------------------------------------------------

(def default-config
  {:install-check-total-time-limit        5000
   :install-check-next-trial-waiting-time 500
   :install-check-eval-time-limit         300
   :eval-time-limit                       10000
   :update-banner-fn                      nil
   :display-user-info-fn                  nil
   :display-user-error-fn                 nil})

(def current-config (atom default-config))

(defn update-config! [config]
  (swap! current-config merge config))

(defn pref [name]
  (name @current-config))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn call-code-as-string [& args]
  (if-let [eval-fn (oget js/window "dirac" "codeAsString")]
    (.apply eval-fn nil (to-array args))
    (error "dirac.codeAsString not found")))

(defn call-eval-with-callback
  ([code]
   (call-eval-with-callback code nil))
  ([code callback]
   (if-let [eval-fn (oget js/window "dirac" "evalInCurrentContext")]
     (eval-fn code callback)
     (throw (ex-info "dirac.evalInCurrentContext not found" nil)))))

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
  (str "devtools.dirac.installed_QMARK_()"))

(defn ^:dynamic output-template [job-id kind text]
  (str "devtools.dirac.present_output(" job-id ", '" kind "', " (call-code-as-string text) ")"))

(defn ^:dynamic postprocess-template [code]
  (str "try{"
       "  devtools.dirac.postprocess_successful_eval(eval(" (call-code-as-string code) "))"
       "} catch (e) {"
       "  devtools.dirac.postprocess_unsuccessful_eval(e)"
       "}"))

(defn console-log-template [method text]
  (str "console." method "(" (call-code-as-string text) ")"))

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

(defn ^:dynamic missing-cljs-devtools-message []
  (str "Dirac requires runtime support from the page context.\n"
       "Please <a href=\"https://github.com/binaryage/dirac#installation\">install cljs-devtools</a> "
       "into your app and "
       "<a href=\"https://github.com/binaryage/dirac#install-cljs-devtools-with-dirac-feature-enabled\">"
       "enable the :dirac feature</a>."))

; -- convenient eval wrapper ------------------------------------------------------------------------------------------------

; this function never throws, returns:
;   [::exception ex] in case of internal problem
;   [::timeout time] in case of timeout
;   [value thrown? exception-details] in case of proper execution
(defn call-eval-with-timeout [code eval-time-limit]
  (let [result-chan (chan)
        timeout-chan (timeout eval-time-limit)
        callback (fn [value thrown? exception-details]
                   (put! result-chan [value thrown? exception-details]))]
    (go
      (try
        (call-eval-with-callback code callback)
        (catch :default ex
          (put! result-chan [::exception ex])))
      (let [[result] (alts! [result-chan timeout-chan])]                                                                      ; when timeout channel closes, the result is nil
        (or result (do
                     (close! result-chan)
                     [::timeout eval-time-limit]))))))

; return with true or ::timeout
(defn wait-for-diract-installed []
  (let [timeout-chan (timeout (pref :install-check-total-time-limit))
        installation-test-eval-time-limit (pref :install-check-eval-time-limit)
        installation-test-code (installation-test-template)
        return (fn [val]
                 (update-banner! "")
                 val)]
    (go-loop []
      (if (core-async/closed? timeout-chan)                                                                                   ; timeout might close outside of alts! se have to have this test here
        (return ::timeout)
        (let [result-chan (call-eval-with-timeout installation-test-code installation-test-eval-time-limit)
              [[value]] (alts! [result-chan timeout-chan])]
          (cond
            (nil? value) (return ::timeout)
            (true? (oget value "value")) (return true)
            :else (do
                    (update-banner! "cljs-devtools: waiting for installation of :dirac feature...")
                    (<! (timeout (pref :install-check-next-trial-waiting-time)))                                              ; don't DoS the VM, wait between installation tests
                    (recur))))))))

; -- simple evaluation for page-context console logging ---------------------------------------------------------------------

(defn console-info [msg]
  (call-eval-with-callback (console-log-template "info" msg)))

(defn console-error [msg]
  (call-eval-with-callback (console-log-template "error" msg)))

(defn console-log [msg]
  (call-eval-with-callback (console-log-template "log" msg)))

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

(def eval-requests-chan (chan))

(defn start-eval-request-queue-processing-loop! []
  (go-loop []
    (if-let [[code handler] (<! eval-requests-chan)]
      (let [call-handler (fn [args & errors]
                           (if-not (empty? errors)
                             (apply display-user-error! errors))
                           (apply handler args))
            installation-result (<! (wait-for-diract-installed))]
        (if (= installation-result ::timeout)
          (call-handler [::timeout] (missing-cljs-devtools-message) (installation-test-template))
          (let [eval-result (<! (call-eval-with-timeout code (pref :eval-time-limit)))]
            (case (first eval-result)
              ::exception (call-handler [::exception] "Internal eval error" (second eval-result))
              ::timeout (call-handler [::timeout] "Evaluation timeout" code)
              (call-handler eval-result))))
        (recur))
      (log "Leaving start-eval-request-queue-processing-loop!"))))

(defn queue-eval-request [code handler]
  (put! eval-requests-chan [code handler]))

; -- fancy evaluation in debugger context -----------------------------------------------------------------------------------

(defn result-handler! [result-chan value thrown? exception-details]
  (case value
    ::exception (put! result-chan [nil true "Evaluation exception"])
    ::timeout (put! result-chan [nil true "Evaluation timeout"])
    (do
      (put! result-chan [(if value (oget value "value")) thrown? exception-details]))))

(defn eval-in-debugger-context! [code]
  (let [result-chan (chan)]
    (queue-eval-request code (partial result-handler! result-chan))
    result-chan))

(defn wrap-with-postprocess-and-eval-in-debugger-context [code]
  (go
    ; for result structure refer to devtools.api.postprocess_successful_eval and devtools.api.postprocess_unsuccessful_eval
    (let [wrapped-code (postprocess-template code)]
      (first (<! (eval-in-debugger-context! wrapped-code))))))

(defn present-output! [job-id kind text]
  (let [code (output-template (int job-id) kind text)]
    (eval-in-debugger-context! code)))

(defn is-devtools-present? []
  (go
    (let [[value] (<! (eval-in-debugger-context! "devtools.dirac"))]
      value)))

(defn get-dirac-api-version []
  (go
    (let [[value] (<! (eval-in-debugger-context! "devtools.dirac.get_api_version()"))]
      (int value))))

(defn get-dirac-client-config []
  (go
    (let [[value] (<! (eval-in-debugger-context! "devtools.dirac.get_effective_config()"))]
      (js->clj value :keywordize-keys true))))