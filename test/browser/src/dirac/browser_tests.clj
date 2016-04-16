(ns dirac.browser-tests
  (:require [clojure.test :refer :all]
            [clojure.java.io :as io]
            [clojure.stacktrace :as stacktrace]
            [dirac.settings :refer [get-launch-task-message
                                    get-default-task-timeout
                                    get-default-test-html-load-timeout
                                    get-signal-server-close-wait-timeout
                                    get-actual-transcripts-root-path
                                    get-expected-transcripts-root-path
                                    get-script-runner-launch-delay
                                    get-fixtures-server-port
                                    get-fixtures-server-url
                                    get-signal-server-host
                                    get-signal-server-port]]
            [dirac.test.fixtures-web-server :refer [with-fixtures-web-server]]
            [dirac.test.nrepl-server :refer [with-nrepl-server]]
            [dirac.test.agent :refer [with-dirac-agent]]
            [dirac.test.chrome-browser :refer [disconnect-browser! reconnect-browser!]]
            [dirac.test.chrome-driver :refer [get-debugging-port extract-javascript-logs]]
            [dirac.lib.ws-server :as server]
            [cuerdas.core :as cuerdas]
            [clj-webdriver.taxi :refer :all]
            [clojure.string :as string]
            [clojure.java.shell :as shell]
            [clj-time.format :as time-format]
            [clj-time.coerce :as time-coerce]
            [clojure.tools.logging :as log]))

; note: we expect current working directory to be dirac root directory ($root)
; $root/test/browser/transcripts/expected/*.txt should contain expected transcripts
; see settings.clj for actual constants

(defonce ^:dynamic *current-transcript-test* nil)
(defonce ^:dynamic *current-transcript-suite* nil)

(defmacro with-transcript-test [test-name & body]
  `(try
     (binding [*current-transcript-test* ~test-name]
       ~@body)
     (catch Throwable e#
       (do-report {:type     :fail
                   :message  (str (get-transcript-test-label ~test-name) " failed.")
                   :expected "no exception"
                   :actual   (str e#)})
       (stacktrace/print-stack-trace e#))))

(defmacro with-transcript-suite [suite-name & body]
  `(binding [*current-transcript-suite* ~suite-name]
     ~@body))

(defn get-transcript-test-label [test-name]
  (str "Transcript test '" test-name "'"))

(defn format-friendly-timeout [timeout-ms]
  (time-format/unparse (time-format/formatters :hour-minute-second-ms)
                       (time-coerce/from-long timeout-ms)))

(defn navigation-timeout-message [_test-name load-timeout test-index-url]
  (str "failed to navigate to index page in time (" load-timeout " ms): " test-index-url))

(defn make-test-runner-url [suite-name test-name]
  (let [debugging-port (get-debugging-port)]
    (str (get-fixtures-server-url) "/runner.html?"
         "task=" suite-name "." test-name
         "&test_runner=1"
         "&debugging_port=" debugging-port)))

(defn navigate-transcript-runner! []
  (let [test-index-url (make-test-runner-url *current-transcript-suite* *current-transcript-test*)
        load-timeout (get-default-test-html-load-timeout)]
    (log/info "navigating to" test-index-url)
    (to test-index-url)
    (try
      (wait-until #(exists? "#status-box") load-timeout)
      (catch Exception e
        (log/error (navigation-timeout-message *current-transcript-test* load-timeout test-index-url))
        (throw e)))))

(defn create-signal-server! []
  (server/create! {:name "Signal server"
                   :host (get-signal-server-host)
                   :port (get-signal-server-port)}))

(defn wait-for-signal
  ([server]
   (wait-for-signal server (get-default-task-timeout)))
  ([server timeout-ms]
   (let [server-url (server/get-url server)
         friendly-timeout (format-friendly-timeout timeout-ms)]
     (log/info (str "waiting for a task signal at " server-url " (timeout " friendly-timeout ")."))
     (if (= ::server/timeout (server/wait-for-first-client server timeout-ms))
       (log/error (str "timeouted while waiting for the task signal."))
       (log/info (str "received the task signal.")))
     ; this is here to give client some time to disconnet before destroying server
     ; devtools would spit "Close received after close" errors in js console
     (Thread/sleep (get-signal-server-close-wait-timeout))
     (server/destroy! server))))

; -- transcript helpers -----------------------------------------------------------------------------------------------------

(defn get-actual-transcript-path-filename [suite-name test-name]
  (str suite-name "-" test-name ".txt"))

(defn get-actual-transcript-path [suite-name test-name]
  (str (get-actual-transcripts-root-path) (get-actual-transcript-path-filename suite-name test-name)))

(defn get-expected-transcript-filename [suite-name test-name]
  (str suite-name "-" test-name ".txt"))

(defn get-expected-transcript-path [suite-name test-name]
  (str (get-expected-transcripts-root-path) (get-expected-transcript-filename suite-name test-name)))

(defn get-canonical-line [line]
  (string/trimr line))

(defn significant-line? [line]
  (not (empty? line)))

(defn get-canonical-transcript [transcript]
  (->> transcript
       (cuerdas/lines)
       (map get-canonical-line)
       (filter significant-line?)                                                                                             ; filter empty lines to work around end-of-the-file new-line issue
       (cuerdas/unlines)))

(defn obtain-transcript []
  (let [test-index-url (make-test-runner-url *current-transcript-suite* *current-transcript-test*)]
    (if-let [test-window-handle (find-window {:url test-index-url})]
      (try
        (switch-to-window test-window-handle)
        (text "#transcript")
        (catch Exception _e
          (throw (ex-info "unable to read transcript" {:body (str "===== DOC BODY =====\n"
                                                                  (text "body")
                                                                  "\n====================\n")}))))
      (throw (ex-info "unable to find window with transcript" {:test-index-url test-index-url})))))

(defn write-transcript! [path transcript]
  (io/make-parents path)
  (spit path transcript))

(defn write-transcript-and-compare []
  (let [test-name *current-transcript-test*
        suite-name *current-transcript-suite*]
    (try
      (when-let [logs (extract-javascript-logs)]
        (println)
        (println (str "*************** JAVASCRIPT LOGS ***************\n" logs))
        (println))
      (let [actual-transcript (get-canonical-transcript (obtain-transcript))
            actual-path (get-actual-transcript-path suite-name test-name)]
        (write-transcript! actual-path actual-transcript)
        (let [expected-path (get-expected-transcript-path suite-name test-name)
              expected-transcript (get-canonical-transcript (slurp expected-path))]
          (if-not (= actual-transcript expected-transcript)
            (do
              (println)
              (println "-----------------------------------------------------------------------------------------------------")
              (println (str "! actual transcript differs for " test-name " test:"))
              (println (str "> diff -U 5 " expected-path " " actual-path))
              (println (:out (shell/sh "diff" "-U" "5" expected-path actual-path)))
              (println "-----------------------------------------------------------------------------------------------------")
              (println (str "> cat " actual-path))
              (println actual-transcript)
              (do-report {:type     :fail
                          :message  (str (get-transcript-test-label test-name) " failed to match expected transcript.")
                          :expected (str "to match expected transcript " expected-path)
                          :actual   (str "didn't match, see " actual-path)}))
            (do-report {:type    :pass
                        :message (str (get-transcript-test-label test-name) " passed.")}))))
      (catch Throwable e
        (do-report {:type     :fail
                    :message  (str (get-transcript-test-label test-name) " failed with an exception.")
                    :expected "no exception"
                    :actual   (str e)})
        (stacktrace/print-stack-trace e)))))

(defn launch-transcript-test-after-delay [delay-ms]
  {:pre [(integer? delay-ms) (not (neg? delay-ms))]}
  (let [script (str "window.postMessage({type:'" (get-launch-task-message) "', delay: " delay-ms "}, '*')")]
    (execute-script script)))

(defn execute-transcript-test! [test-name]
  (with-transcript-test test-name
    (let [signal-server (create-signal-server!)]
      (navigate-transcript-runner!)
      ; chrome driver needs some time to cooldown after disconnection
      ; to prevent random org.openqa.selenium.SessionNotCreatedException exceptions
      ; also we want to run our transcript test safely after debugger port is available for devtools after driver disconnection
      (launch-transcript-test-after-delay (get-script-runner-launch-delay))
      (disconnect-browser!)
      (wait-for-signal signal-server)
      (reconnect-browser!)
      (write-transcript-and-compare))))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(use-fixtures :once with-fixtures-web-server with-nrepl-server with-dirac-agent)

; -- individual tests -------------------------------------------------------------------------------------------------------

(defn fixtures-web-server-check []
  (to (get-fixtures-server-url))
  (is (= (text "body") "fixtures web-server ready")))

(deftest test-all
  (fixtures-web-server-check)
  (with-transcript-suite "suite01"
    (execute-transcript-test! "open-close-dirac")
    (execute-transcript-test! "no-agent-connection")
    (execute-transcript-test! "dirac-eval")))