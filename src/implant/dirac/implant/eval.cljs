(ns dirac.implant.eval
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan]]
            [clojure.string :as string]))

(def ^:dynamic output-template
  "devtools.dirac.present_output({job-id}, '{kind}', {text})")

(def ^:dynamic postprocess-template
  "try{
    devtools.dirac.postprocess_successful_eval(eval({code}))
   } catch (e) {
    devtools.dirac.postprocess_unsuccessful_eval(e)
   }")

(defn ^:dynamic thrown-assert-msg [exception-details code]
  (str "postprocessed code must never throw!\n"
       exception-details
       "---------\n"
       code))

(defn ^:dynamic null-result-assert-msg [result]
  (str "postprocessed code must return non-null postprocessed result"
       "result: '" result "' "
       "type: " (type result)))

(defn ^:dynamic invalid-type-key-assert-msg []
  "postprocessed code must return a js object with type key set to \"object\"")

(defn ^:dynamic missing-value-key-assert-msg []
  "postprocessed code must return a js object with \"value\" key defined")

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

(defn start-eval-request-queue-processing! []
  (go-loop []
    (if-let [[code handler] (<! eval-requests-chan)]
      (do
        (let [wait-chan (chan)
              wrapped-handler (fn [& args]
                                (let [res (apply handler args)]
                                  (put! wait-chan :next)
                                  res))]                                                                                      ; TODO: timeout?
          (try
            (js/dirac.evalInCurrentContext code wrapped-handler)
            (catch :default e
              ; this should never happen unless our code templating is broken
              (.error js/console
                      "failed dirac.evalInCurrentContext\n" e
                      "\n\n-------- code:\n" code)))                                                                          ; TODO: this should be reported in a better way
          (<! wait-chan)
          (recur)))                                                                                                           ; wait for task to complete
      (.log js/console "Leaving eval-request-queue-processing"))))

(defn queue-eval-request [code handler]
  (put! eval-requests-chan [code handler]))

; -- fancy evaluation in a debugger context ---------------------------------------------------------------------------------

(defn result-handler [result-chan result thrown? exception-details]
  (put! result-chan {:result            result
                     :thrown?           thrown?
                     :exception-details exception-details}))

(defn eval-in-debugger-context [code]
  (let [result-chan (chan)]
    (queue-eval-request code (partial result-handler result-chan))
    result-chan))

(defn wrap-with-postprocess-and-eval-in-debugger-context [code]
  (go
    ; for result structure refer to devtools.api.postprocess_successful_eval and devtools.api.postprocess_unsuccessful_eval
    (let [code (string/replace postprocess-template "{code}" (js/dirac.codeAsString code))
          {:keys [thrown? result exception-details]} (<! (eval-in-debugger-context code))]
      (assert (not thrown?) (thrown-assert-msg exception-details code))
      (assert (not (nil? result)) (null-result-assert-msg result))
      (assert (= (aget result "type") "object") (invalid-type-key-assert-msg))
      (let [value (aget result "value")]
        (assert value (missing-value-key-assert-msg))
        value))))

(defn present-output [job-id kind text]
  (let [id (int job-id)
        code (-> output-template
                 (string/replace "{job-id}" id)
                 (string/replace "{kind}" kind)
                 (string/replace "{text}" (js/dirac.codeAsString text)))]
    (eval-in-debugger-context code)))