(ns dirac.nrepl.driver
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [cljs.repl :as cljs-repl]
            [dirac.nrepl.sniffer :as sniffer]
            [clojure.tools.logging :as log])
  (:import (clojure.lang IExceptionInfo)
           (java.io StringWriter PrintWriter)))

; -- driver construction ----------------------------------------------------------------------------------------------------

(defn get-initial-settings []
  {:current-job                          (volatile! nil)                                                                      ; current job-id
   :recording?                           (volatile! false)                                                                    ; should we record printing into *out* and *err*?
   :suppress-flushing                    (volatile! #{})                                                                      ; temporary suppression of flushing, contains a set of sniffer-keys
   :suppress-print-recording-until-flush (volatile! #{})})                                                                    ; temporary suppression of recording, contains a set of sniffer-keys)

(defn make-driver [extra-settings]
  (merge (get-initial-settings) extra-settings))

; -- getters/setters --------------------------------------------------------------------------------------------------------

(defn get-sniffer [driver sniffer-key]
  (let [sniffer& (get-in driver [:sniffers sniffer-key])]
    (assert sniffer&)
    @sniffer&))

(defn set-sniffer! [driver sniffer-key sniffer]
  (vreset! (get-in driver [:sniffers sniffer-key]) sniffer))

(defn get-send-response-fn [driver]
  (:send-response-fn driver))

; -- job management ---------------------------------------------------------------------------------------------------------

(defn get-current-job [driver]
  @(:current-job driver))

(defn start-job! [driver job]
  {:pre [(not @(:current-job driver))]}
  (vreset! (:current-job driver) job))

(defn stop-job! [driver]
  {:pre [@(:current-job driver)]}
  (vreset! (:current-job driver) nil))

(defn send! [driver msg]
  (let [send-fn (get-send-response-fn driver)]
    (send-fn msg)))

(defn report-output [driver job-id output-kind content]
  (send! driver {:op      :print-output
                 :id      job-id
                 :kind    output-kind
                 :content content}))

; -- recording/flushing suppression -----------------------------------------------------------------------------------------

(defn suppress-recording-until-flush [driver sniffer-key]
  (let [suppress-var (:suppress-print-recording-until-flush driver)]
    (vreset! suppress-var (conj @suppress-var sniffer-key))))

(defn unsuppress-recording-until-flush [driver sniffer-key]
  (let [suppress-var (:suppress-print-recording-until-flush driver)]
    (vreset! suppress-var (disj @suppress-var sniffer-key))))

(defn suppressed-recording-until-flush? [driver sniffer-key]
  (let [suppress-var (:suppress-print-recording-until-flush driver)]
    (sniffer-key @suppress-var)))

(defn suppress-flushing [driver sniffer-key]
  (let [suppress-var (:suppress-flushing driver)]
    (vreset! suppress-var (conj @suppress-var sniffer-key))))

(defn unsuppress-flushing [driver sniffer-key]
  (let [suppress-var (:suppress-flushing driver)]
    (vreset! suppress-var (disj @suppress-var sniffer-key))))

(defn suppressed-flushing? [driver sniffer-key]
  (let [suppress-var (:suppress-flushing driver)]
    (sniffer-key @suppress-var)))

; -- print recording --------------------------------------------------------------------------------------------------------

(defn recording? [driver]
  @(:recording? driver))

(defn reset-sniffer-state! [driver sniffer-key]
  (unsuppress-recording-until-flush driver sniffer-key)
  (unsuppress-flushing driver sniffer-key)
  (sniffer/clear-content! (get-sniffer driver sniffer-key)))

(defn start-recording! [driver]
  (reset-sniffer-state! driver :stdout)
  (reset-sniffer-state! driver :stderr)
  (vreset! (:recording? driver) true))

(defn flush-sniffer!
  ([driver sniffer-key]
   (flush-sniffer! driver sniffer-key sniffer-key))
  ([driver sniffer-key output-kind]
   (let [sniffer (get-sniffer driver sniffer-key)
         content (sniffer/extract-content! sniffer)]
     (if-not (nil? content)
       (report-output driver (get-current-job driver) output-kind content)))))

(defn flush! [driver]
  (flush-sniffer! driver :stdout)
  (flush-sniffer! driver :stderr))

(defn stop-recording! [driver]
  (when (recording? driver)
    (flush! driver)
    (vreset! (:recording? driver) false)))

(defn report-java-trace! [driver f]
  (suppress-flushing driver :stderr)
  (f)
  (unsuppress-flushing driver :stderr)
  (flush-sniffer! driver :stderr :java-trace))

(defn capture-exception-details [e]
  (let [exception-output (StringWriter.)]
    (cond
      (instance? Throwable e) (.printStackTrace e (PrintWriter. exception-output))
      :else (.write exception-output (pr-str e)))
    (str exception-output)))

; -- REPL handler factories -------------------------------------------------------------------------------------------------

(defn custom-caught-factory [driver]
  (fn [e repl-env opts]
    (let [root-ex (#'clojure.main/root-cause e)]
      (when-not (instance? ThreadDeath root-ex)
        (let [orig-call #(cljs-repl/repl-caught e repl-env opts)]
          (if-not (recording? driver)
            (do
              ; in case we are not recording, we want to report :eval-error to the driver
              ; and log error information as well
              (orig-call)
              (let [exception-details (capture-exception-details e)]
                (log/error "Caught an exception during REPL evaluation:\n" exception-details)
                (send! driver {:status  :eval-error
                               :ex      (str (class e))
                               :root-ex (str (class root-ex))
                               :details exception-details})))
            (if (and (instance? IExceptionInfo e)
                     (#{:js-eval-error :js-eval-exception} (:type (ex-data e))))
              (do
                ; we want to prevent recording javascript errors and exceptions,
                ; because those were already reported on client-side directly
                ; other exceptional cases should be recorded as usual (for example exceptions originated in the compiler)
                (stop-recording! driver)
                (orig-call)
                (start-recording! driver))
              (do
                ; we've got a java exception with possibly long stack trace
                ; it will be printed in cljs.repl/repl-caught via (.printStackTrace e *err*)
                ; we capture output and send it to client side with special kind :java-trace
                ; with this hint, client-side should implement a nice way how to present this to the user
                (report-java-trace! driver orig-call)))))))))

; -- sniffer handlers -------------------------------------------------------------------------------------------------------

(defn flush-handler
  "This method gets callled every time *out* (or *err*) gets flushed.
  If flushing is allowed, our job is to send accumulated (recorded) output to client side.
  In case of recording was suppressed, we throw away the content and just flip the flag back instead."
  [driver sniffer-key]
  (if-not (suppressed-flushing? driver sniffer-key)
    (let [sniffer (get-sniffer driver sniffer-key)]
      (if-let [content (sniffer/extract-all-lines-but-last! sniffer)]
        (if (recording? driver)
          (if (suppressed-recording-until-flush? driver sniffer-key)
            (unsuppress-recording-until-flush driver sniffer-key)
            (report-output driver (get-current-job driver) sniffer-key content)))))))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn wrap-repl-with-driver [repl-env repl-opts start-fn send-response-fn]
  (let [driver (make-driver {:send-response-fn send-response-fn
                             :sniffers         {:stdout (volatile! nil)
                                                :stderr (volatile! nil)}})
        orig-flush-fn (:flush repl-opts)
        updated-repl-opts (assoc repl-opts
                            :flush (fn []
                                     (if (fn? orig-flush-fn)
                                       (orig-flush-fn))
                                     (flush! driver))
                            :caught (custom-caught-factory driver))
        updated-repl-env repl-env]
    (let [stdout-sniffer (sniffer/make-sniffer *out* (partial flush-handler driver :stdout))
          stderr-sniffer (sniffer/make-sniffer *err* (partial flush-handler driver :stderr))]
      (try
        (set-sniffer! driver :stdout stdout-sniffer)
        (set-sniffer! driver :stderr stderr-sniffer)
        (binding [*out* stdout-sniffer
                  *err* stderr-sniffer]
          (start-recording! driver)
          (start-fn driver updated-repl-env updated-repl-opts))
        (finally
          (stop-recording! driver)
          (sniffer/destroy-sniffer stdout-sniffer)
          (sniffer/destroy-sniffer stderr-sniffer))))))
