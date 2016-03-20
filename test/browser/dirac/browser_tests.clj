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

(defn log [& args]
  (apply println "Tests Runner:" args))

(defn make-test-index-url [test-name]
  (let [debugging-port (get-debugging-port)]
    (str "http://localhost:9090/" test-name "/resources/index.html?test_runner=1&debugging_port=" debugging-port)))

(defn navigate-transcript-test! [test-name]
  (let [test-index-url (make-test-index-url test-name)]
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

(defn get-actual-transcript-path [name]
  (str actual-transcripts-root-path name ".txt"))

(defn get-expected-transcript-path [name]
  (str expected-transcripts-root-path name ".txt"))

(defn normalize-transcript [transcript]
  (-> transcript
      (string/trim)))

(defn obtain-transcript [test-name]
  (let [test-index-url (make-test-index-url test-name)
        test-window-handle (find-window {:url test-index-url})]
    (if test-window-handle
      (try
        (switch-to-window test-window-handle)
        (text "#transcript")
        (catch Exception _e
          (throw (ex-info "unable to read transcript" {:body (str "===== DOC BODY =====\n"
                                                                  (text "body")
                                                                  "\n====================\n")}))))
      (throw (ex-info "unable to find window with transcript" {:test-index-url test-index-url})))))

(defn write-transcript-and-compare [test-name]
  (try
    (let [actual-transcript (normalize-transcript (obtain-transcript test-name))
          actual-path (get-actual-transcript-path test-name)]
      (io/make-parents actual-path)
      (spit actual-path actual-transcript)
      (let [expected-path (get-expected-transcript-path test-name)
            expected-transcript (normalize-transcript (slurp expected-path))]
        (if-not (= actual-transcript expected-transcript)
          (do
            (println)
            (println "-------------------------------------------------------------------------------------------------------")
            (println "! expected and actual transcripts differ for" test-name "test:")
            (println (str "> diff -U 5 expected/" test-name ".txt actual/" test-name ".txt"))
            (println (:out (shell/sh "diff" "-U" "5" expected-path actual-path)))
            (println "-------------------------------------------------------------------------------------------------------")
            (println (str "> cat actual/" test-name ".txt"))
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

(defn p01 []
  (navigate-transcript-test! "p01")
  (disconnect-browser!)
  (wait-for-task-to-finish (* 1 MINUTE))                                                                                      ; TODO: increase
  (reconnect-browser!)
  (is (write-transcript-and-compare "p01")))

(deftest test-all
  (fixtures-web-server-check)
  (p01))