(ns dirac.automation.test
  (:require-macros [dirac.automation.test :refer [with-captured-output]])
  (:require [cljs.test :refer [report]]
            [dirac.utils]
            [dirac.automation.transcript-host :as transcript-host]))

; this namespace exists to override standard cljs.test behaviour
;   * we want to post-process cljs.test reporting output (styling and new lines)
;   * we want to redirect the cljs.test output into transcript

; -- summary counters -------------------------------------------------------------------------------------------------------

(defonce actions-executed (volatile! 0))
(defonce transcript-checkpoints (volatile! 0))

(defn record-action-execution! []
  (vswap! actions-executed inc))

(defn record-transcript-checkpoint! [num]
  (vswap! transcript-checkpoints (partial + num)))

; ---------------------------------------------------------------------------------------------------------------------------

(defonce previous-begin-test-ns-method (-get-method report [:cljs.test/default :begin-test-ns]))
(defonce previous-error-method (-get-method report [:cljs.test/default :error]))
(defonce previous-fail-method (-get-method report [:cljs.test/default :fail]))

(defmethod report [:cljs.test/default :begin-test-ns] [m]
  (let [output (with-captured-output
                 (previous-begin-test-ns-method m))]
    (transcript-host/append-to-transcript! "ns" output)))

(defmethod report [:cljs.test/default :fail] [m]
  (let [output (with-captured-output
                 (previous-fail-method m))]
    (transcript-host/append-to-transcript! "fail" output)))

(defmethod report [:cljs.test/default :error] [m]
  (let [output (with-captured-output
                 (previous-error-method m))]
    (transcript-host/append-to-transcript! "error" output)))

(defmethod report [:cljs.test/default :summary] [m]
  (let [assertions (+ (:pass m) (:fail m) (:error m))
        output (str "Automated " @actions-executed " actions with "
                    @transcript-checkpoints " check-points containing "
                    assertions " assertions.\n"
                    (:fail m) " failures, " (:error m) " errors.")
        ok? (zero? (+ (:fail m) (:errors m)))
        label (str "summary" (if-not ok? " (fail)"))]
    (transcript-host/append-to-transcript! label output)))