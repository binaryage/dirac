(ns dirac.nrepl.driver
  (:require [clojure.tools.logging :as log]
            [clojure.main :as clojure-main]
            [cljs.repl :as cljs-repl]
            [dirac.nrepl.sniffer :as sniffer]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.protocol :as protocol]))

; -- driver construction ----------------------------------------------------------------------------------------------------

(defn get-initial-settings []
  {:current-job (volatile! nil)                                                                                               ; current job-id
   :recording?  (volatile! false)})                                                                                           ; should we record printing into *out* and *err*?

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
  (when-some [send-fn (get-send-response-fn driver)]
    (send-fn (assoc msg :id (get-current-job driver)))))

(defn report-output [driver output-kind content]
  (let [response (protocol/prepare-print-output-response output-kind content (:output-format driver))]
    (send! driver response)))

; -- print recording --------------------------------------------------------------------------------------------------------

(defn recording? [driver]
  @(:recording? driver))

(defn reset-sniffer-state! [driver sniffer-key]
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
     (when-not (nil? content)
       (report-output driver output-kind content)))))

(defn flush! [driver]
  (flush-sniffer! driver :stdout)
  (flush-sniffer! driver :stderr))

(defn stop-recording! [driver]
  (when (recording? driver)
    (flush! driver)
    (vreset! (:recording? driver) false)))

; -- REPL handler factories -------------------------------------------------------------------------------------------------

(defn caught! [driver e repl-env opts]
  (log/trace "caught!" e)
  (let [root-ex (clojure-main/root-cause e)
        javascript-eval-trouble? (helpers/javascript-eval-trouble? e)]
    (when-not (instance? ThreadDeath root-ex)                                                                                 ; TODO: investigate if this test is really needed in our case
      (let [call-cljs-repl-caught! #(cljs-repl/repl-caught e repl-env opts)]
        (if-not (recording? driver)
          (call-cljs-repl-caught!)
          (when javascript-eval-trouble?
            ; we want to prevent recording javascript errors and exceptions,
            ; because those were already reported on client-side directly
            ; other exceptional cases should be recorded as usual (for example exceptions originated in the compiler)
            (stop-recording! driver)
            (call-cljs-repl-caught!)
            (start-recording! driver))))
      ; last send :eval-error for traditional REPL clients, it will be ignored by Dirac client,
      ; also see trace-printing transport wrapper
      (let [base-response {:status  :eval-error
                           :ex      (str (class e))
                           :root-ex (str (class root-ex))
                           :details (helpers/capture-exception-details e)}
            response (cond-> base-response
                             javascript-eval-trouble? (merge {:javascript-eval-trouble true}))]
        (send! driver response)))))

; -- sniffer handlers -------------------------------------------------------------------------------------------------------

(defn flush-handler
  "This method gets called every time *out* (or *err*) gets flushed.
  If flushing is allowed, our job is to send accumulated (recorded) output to client side.
  In case of recording was suppressed, we throw away the content and just flip the flag back instead."
  [driver sniffer-key]
  (let [sniffer (get-sniffer driver sniffer-key)]
    (when-some [content (sniffer/extract-all-lines-but-last! sniffer)]
      (when (recording? driver)
        (report-output driver sniffer-key content)))))

; -- initialization ---------------------------------------------------------------------------------------------------------

(defn wrap-with-driver [job-id start-fn send-response-fn output-format]
  (let [driver (make-driver {:send-response-fn send-response-fn
                             :output-format    output-format
                             :sniffers         {:stdout (volatile! nil)
                                                :stderr (volatile! nil)}})
        stdout-sniffer (sniffer/make-sniffer *out* (partial flush-handler driver :stdout))
        stderr-sniffer (sniffer/make-sniffer *err* (partial flush-handler driver :stderr))
        caught-fn (partial caught! driver)
        flush-fn (partial flush! driver)]
    (set-sniffer! driver :stdout stdout-sniffer)
    (set-sniffer! driver :stderr stderr-sniffer)
    (binding [*out* stdout-sniffer
              *err* stderr-sniffer]
      (try
        (start-job! driver job-id)
        (start-recording! driver)
        (start-fn driver caught-fn flush-fn)
        (finally
          (stop-recording! driver)
          (stop-job! driver)
          (sniffer/destroy-sniffer stdout-sniffer)
          (sniffer/destroy-sniffer stderr-sniffer))))))
