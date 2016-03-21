(ns dirac.browser-tests
  (:require [clojure.test :refer :all]
            [clojure.java.io :as io]
            [dirac.test.fixtures-web-server :refer [with-fixtures-web-server]]
            [dirac.test.chrome-browser :refer [with-chrome-browser disconnect-browser!
                                               reconnect-browser! get-debugging-port
                                               extract-javascript-logs]]
            [dirac.lib.ws-server :as server]
            [clj-webdriver.taxi :refer :all]
            [clojure.string :as string]
            [clojure.java.shell :as shell]))

; note: we expect current working directory to be dirac root directory ($root)
; $root/test/browser/transcripts/expected/*.txt should contain expected transcripts

(def actual-transcripts-root-path "test/browser/transcripts/actual/")
(def expected-transcripts-root-path "test/browser/transcripts/expected/")

(def ^:const SECOND 1000)
(def ^:const MINUTE (* 60 SECOND))
(def ^:const DEFAULT_TASK_TIMEOUT (* 5 MINUTE))

(defonce ^:dynamic *current-transcript-test* nil)
(defonce ^:dynamic *current-transcript-suite* nil)

(defmacro with-transcript-test [test-name & body]
  `(binding [*current-transcript-test* ~test-name]
     ~@body))

(defmacro with-transcript-suite [suite-name & body]
  `(binding [*current-transcript-suite* ~suite-name]
     ~@body))

(defn log [& args]
  (apply println "Tests Runner:" args))

(defn make-test-index-url [suite-name test-name]
  (let [debugging-port (get-debugging-port)]
    (str "http://localhost:9090/" suite-name "/resources/" test-name ".html?test_runner=1&debugging_port=" debugging-port)))

(defn navigate-transcript-test! []
  (let [test-index-url (make-test-index-url *current-transcript-suite* *current-transcript-test*)]
    (println "navigating to" test-index-url)
    (to test-index-url)))

(defn wait-for-task-to-finish
  ([]
   (wait-for-task-to-finish DEFAULT_TASK_TIMEOUT))
  ([timeout-ms]
   (let [server (server/create! {:name "Task signaller"
                                 :host "localhost"
                                 :port 22555})
         server-url (server/get-url server)]
     (println (str "Waiting for task signals at " server-url " (timeout " timeout-ms " ms)."))
     (if (= ::server/timeout (server/wait-for-first-client server timeout-ms))
       (println (str "Timeout while waiting for task signal (after " timeout-ms " ms)."))
       (println (str "Got 'task finished' signal"))))))

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
  (try
    (let [test-name *current-transcript-test*
          suite-name *current-transcript-suite*
          actual-transcript (canonic-transcript (obtain-transcript))
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
            false)
          true)))
    (catch Exception e
      (log "unable to write-transcript-and-compare" e)
      (if-let [logs (extract-javascript-logs)]
        (log (str "*************** JAVASCRIPT LOGS ***************\n" logs)))
      false)))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(use-fixtures :once with-chrome-browser with-fixtures-web-server)

; -- individual tests -------------------------------------------------------------------------------------------------------

(defn fixtures-web-server-check []
  (to "http://localhost:9090")
  (is (= (text "body") "fixtures web-server ready")))

(defn no-agent-connection []
  (with-transcript-test "no-agent-connection"
    (navigate-transcript-test!)
    (disconnect-browser!)
    (wait-for-task-to-finish (* 5 MINUTE))
    (reconnect-browser!)
    (is (write-transcript-and-compare))))

(deftest test-all
  (fixtures-web-server-check)
  (with-transcript-suite "suite01"
    (no-agent-connection)))