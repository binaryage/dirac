(ns dirac.browser-tests
  (:require [clojure.test :refer :all]
            [clojure.java.io :as io]
            [clojure.stacktrace :as stacktrace]
            [dirac.test.fixtures-web-server :refer [with-fixtures-web-server]]
            [dirac.test.chrome-browser :refer [with-chrome-browser disconnect-browser!
                                               reconnect-browser! get-debugging-port
                                               extract-javascript-logs
                                               get-safe-delay-for-script-runner-to-launch-transcript-test]]
            [dirac.lib.ws-server :as server]
            [clj-webdriver.taxi :refer :all]
            [clojure.string :as string]
            [clojure.java.shell :as shell]
            [clj-time.format :as time-format]
            [clj-time.coerce :as time-coerce]))

; note: we expect current working directory to be dirac root directory ($root)
; $root/test/browser/transcripts/expected/*.txt should contain expected transcripts

(def actual-transcripts-root-path "test/browser/transcripts/actual/")
(def expected-transcripts-root-path "test/browser/transcripts/expected/")

(def ^:const SECOND 1000)
(def ^:const MINUTE (* 60 SECOND))
(def ^:const DEFAULT_TASK_TIMEOUT (* 5 MINUTE))
(def ^:const DEFAULT_TEST_HTML_LOAD_TIMEOUT (* 1 SECOND))

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

(defn log [& args]
  (apply println "*** RUNNER:" args))

(defn get-transcript-test-label [test-name]
  (str "Transcript test '" test-name "'"))

(defn format-friendly-timeout [timeout-ms]
  (time-format/unparse (time-format/formatters :hour-minute-second-ms)
                       (time-coerce/from-long timeout-ms)))

(defn navigation-timeout-message [_test-name load-timeout test-index-url]
  (str "failed to navigate to index page in time (" load-timeout " ms): " test-index-url))

(defn make-test-index-url [suite-name test-name]
  (let [debugging-port (get-debugging-port)]
    (str "http://localhost:9090/" suite-name "/resources/" test-name ".html?test_runner=1&debugging_port=" debugging-port)))

(defn navigate-transcript-test! []
  (let [test-index-url (make-test-index-url *current-transcript-suite* *current-transcript-test*)
        load-timeout DEFAULT_TEST_HTML_LOAD_TIMEOUT]
    (log "navigating to" test-index-url)
    (to test-index-url)
    (try
      (wait-until #(exists? "#status-box") load-timeout)
      (catch Exception e
        (log (navigation-timeout-message *current-transcript-test* load-timeout test-index-url))
        (throw e)))))

(defn wait-for-task-to-finish
  ([]
   (wait-for-task-to-finish DEFAULT_TASK_TIMEOUT))
  ([timeout-ms]
   (let [server (server/create! {:name "Task signaller"
                                 :host "localhost"
                                 :port 22555})
         server-url (server/get-url server)
         friendly-timeout (format-friendly-timeout timeout-ms)]
     (log (str "waiting for task signals at " server-url " (timeout " friendly-timeout ")."))
     (if (= ::server/timeout (server/wait-for-first-client server timeout-ms))
       (log (str "timeouted while waiting for task signal."))
       (log (str "received 'task finished' signal.")))
     (server/destroy! server))))

; -- transcript helpers -----------------------------------------------------------------------------------------------------

(defn get-actual-transcript-path-filename [suite-name test-name]
  (str suite-name "-" test-name ".txt"))

(defn get-actual-transcript-path [suite-name test-name]
  (str actual-transcripts-root-path (get-actual-transcript-path-filename suite-name test-name)))

(defn get-expected-transcript-filename [suite-name test-name]
  (str suite-name "-" test-name ".txt"))

(defn get-expected-transcript-path [suite-name test-name]
  (str expected-transcripts-root-path (get-expected-transcript-filename suite-name test-name)))

(defn canonic-transcript [transcript]
  (-> transcript
      (string/trim)))

(defn obtain-transcript []
  (let [test-index-url (make-test-index-url *current-transcript-suite* *current-transcript-test*)]
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
      (let [actual-transcript (canonic-transcript (obtain-transcript))
            actual-path (get-actual-transcript-path suite-name test-name)]
        (write-transcript! actual-path actual-transcript)
        (let [expected-path (get-expected-transcript-path suite-name test-name)
              expected-transcript (canonic-transcript (slurp expected-path))]
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
        (when-let [logs (extract-javascript-logs)]
          (println (str "*************** JAVASCRIPT LOGS ***************\n" logs))
          (println))
        (stacktrace/print-stack-trace e)))))

(defn launch-transcript-test-after-delay [delay-ms]
  {:pre [(integer? delay-ms) (not (neg? delay-ms))]}
  (let [script (str "window.postMessage({type:'launch-transcript-test', delay: " delay-ms "}, '*')")]
    (execute-script script)))

(defn execute-transcript-test! [test-name]
  (with-transcript-test test-name
    (navigate-transcript-test!)
    (launch-transcript-test-after-delay (get-safe-delay-for-script-runner-to-launch-transcript-test))
    (disconnect-browser!)
    (wait-for-task-to-finish (* 5 MINUTE))
    (reconnect-browser!)
    (write-transcript-and-compare)))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(use-fixtures :once with-chrome-browser with-fixtures-web-server)

; -- individual tests -------------------------------------------------------------------------------------------------------

(defn fixtures-web-server-check []
  (to "http://localhost:9090")
  (is (= (text "body") "fixtures web-server ready")))

(deftest test-all
  (fixtures-web-server-check)
  (with-transcript-suite "suite01"
    (execute-transcript-test! "no-agent-connection")
    (execute-transcript-test! "open-close-dirac")))