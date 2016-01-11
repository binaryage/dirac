(ns dirac.implant.eval
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan]]
            [clojure.string :as string]))

(def ^:dynamic out-template
  "devtools.dirac.present_output({job-id}, 'stdout', {text})")

(def ^:dynamic err-template
  "devtools.dirac.present_output({job-id}, 'stderr', {text})")

(def ^:dynamic postprocess-template
  "try{
    devtools.dirac.postprocess_successful_eval(eval({code}))
   } catch (e) {
    devtools.dirac.postprocess_unsuccessful_eval(e)
   }")

(defn thrown-assert-msg [exception-details code]
  (str "postprocessed code must never throw!\n"
       exception-details
       "---------\n"
       code))

(defn null-result-assert-msg [result]
  (str "postprocessed code must return non-null postprocessed result"
       "result: '" result "' "
       "type: " (type result)))

(defn invalid-type-key-assert-msg []
  "postprocessed code must return a js object with type key set to \"object\"")

(defn missing-value-key-assert-msg []
  "postprocessed code must return a js object with \"value\" key defined")

; -- fancy evaluation in a debugger context ---------------------------------------------------------------------------------

(defn result-handler [result-chan result thrown? exception-details]
  (put! result-chan {:result            result
                     :thrown?           thrown?
                     :exception-details exception-details}))

(defn eval-in-debugger-context [code]
  (try
    (let [result-chan (chan)]
      (js/dirac.evalInCurrentContext code (partial result-handler result-chan))
      result-chan)
    (catch :default e
      ; this should never happen unless our code is broken
      (.error js/console "failed eval-in-debugger-context\n" e "\n\n-------- code:\n" code)                                   ; TODO: this should be reported in a better way
      (throw e))))

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

(defn present-out-message [job-id text]
  (let [id (int job-id)
        code (-> out-template
                 (string/replace "{job-id}" id)
                 (string/replace "{text}" (js/dirac.codeAsString text)))]
    (eval-in-debugger-context code)))

(defn present-err-message [job-id text]
  (let [id (int job-id)
        code (-> err-template
                 (string/replace "{job-id}" id)
                 (string/replace "{text}" (js/dirac.codeAsString text)))]
    (eval-in-debugger-context code)))