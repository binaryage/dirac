(ns dirac.implant.eval
  (:require [cljs.core.async :refer [put! chan]]
            [clojure.string :as string]))

; -- fancy evaluation in the context of a debugger --------------------------------------------------------------------------

(def ^:dynamic code-wrapping-template
  "try{
    devtools.dirac.postprocess_successful_eval(eval({code}))
   } catch (e) {
    devtools.dirac.postprocess_unsuccessful_eval(e)
   }")

(defn eval-debugger-context-and-postprocess [code]
  (let [result-chan (chan)
        wrapped-code (string/replace code-wrapping-template "{code}" (js/dirac.codeAsString code))
        result-handler (fn [result thrown? exception-details]
                         ; for result structure refer to
                         ;   devtools.api.postprocess_successful_eval and devtools.api.postprocess_unsuccessful_eval
                         (assert (not thrown?)
                                 (str "wrapped code must never throw!\n"
                                      (pr-str exception-details)
                                      "---------\n"
                                      wrapped-code))
                         (assert (not (nil? result))
                                 (str "wrapped code must return non-null postprocessed result"
                                      "result: '" (pr-str result) "' type: " (type result)))
                         (assert (= (aget result "type") "object")
                                 "wrapped code must return a js object with type key set to \"object\"")
                         (let [value (aget result "value")]
                           (assert value "wrapped code must return a js object with \"value\" key defined")
                           (put! result-chan value)))]
    (try
      (js/dirac.evalInCurrentContext wrapped-code result-handler)
      (catch :default e
        (error "failed executing" wrapped-code "\n\n" e)))
    result-chan))