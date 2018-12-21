(ns dirac.tests.browser.tasks.transcript
  (:require [clj-webdriver.taxi :as taxi]
            [clojure.java.io :as io]
            [clojure.java.shell :refer [sh]]
            [clojure.stacktrace :as stacktrace]
            [clojure.string :as string]
            [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [dirac.settings :refer [get-default-test-html-load-timeout
                                    get-script-runner-launch-delay
                                    get-task-disconnected-wait-timeout
                                    get-transcript-max-chrome-log-lines]]
            [dirac.shared.travis :refer [with-travis-fold]]
            [dirac.test-lib.chrome-driver :refer [extract-javascript-logs]]
            [dirac.tests.browser.tasks.helpers :refer [get-actual-transcript-path get-browser-test-filter
                                                       get-canonical-transcript get-expected-transcript-path
                                                       get-transcript-test-label get-transcript-test-label
                                                       launch-transcript-test-after-delay! make-test-runner-url
                                                       navigation-timeout-message produce-diff]]
            [dirac.tests.browser.tasks.macros :refer [with-transcript-test]]
            [dirac.tests.browser.tasks.signal-server :refer [create-signal-server! wait-for-signal!]]
            [dirac.tests.browser.tasks.task-state :refer [make-task-state]]
            [environ.core :refer [env]]))

(defonce ^:dynamic *current-transcript-test* nil)
(defonce ^:dynamic *current-transcript-suite* nil)

(def chrome-log-file-separator-start
  ">>>> CHROME LOGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")

(def chrome-log-file-separator-end
  "<<<< CHROME LOGS <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")

; -- transcript helpers -----------------------------------------------------------------------------------------------------

(defn navigate-transcript-runner! []
  (let [test-index-url (make-test-runner-url *current-transcript-suite* *current-transcript-test*)
        load-timeout (get-default-test-html-load-timeout)]
    (log/info "navigating to" test-index-url)
    (taxi/to test-index-url)
    (try
      (taxi/wait-until #(taxi/exists? "#status-box") load-timeout)
      (catch Exception e
        (log/error (navigation-timeout-message *current-transcript-test* load-timeout test-index-url))
        (throw e)))))

(defn obtain-transcript! []
  (let [test-index-url (make-test-runner-url *current-transcript-suite* *current-transcript-test*)]
    (if-let [test-window-handle (taxi/find-window {:url test-index-url})]
      (try
        (taxi/switch-to-window test-window-handle)
        (taxi/text "#transcript")
        (catch Exception _e
          (throw (ex-info "unable to read transcript" {:body (str "===== DOC BODY =====\n"
                                                                  (taxi/text "body")
                                                                  "\n====================\n")}))))
      (throw (ex-info "unable to find window with transcript" {:test-index-url test-index-url})))))

(defn write-transcript! [path transcript]
  (io/make-parents path)
  (spit path transcript))

(defn compare-transcripts! [test-name actual-transcript expected-transcript actual-transcript-path expected-transcript-path]
  (if (= actual-transcript expected-transcript)
    true
    (do
      (println)
      (println "-----------------------------------------------------------------------------------------------------")
      (println (str "! actual transcript differs for " test-name " test:"))
      (println)
      (println (produce-diff expected-transcript-path actual-transcript-path))
      (println "-----------------------------------------------------------------------------------------------------")
      (println (str "> cat " actual-transcript-path))
      (println)
      (println actual-transcript)
      false)))

(def handshake-params-matching-re #"devtools/front_end/handshake.html\?.*?\"}")
(def handshake-params-replacement "devtools/front_end/handshake.html?...\"}")

; remove some noisy stuff from dumped logs
(defn post-process-chrome-log-result [text]
  (-> text
      (string/replace handshake-params-matching-re handshake-params-replacement)))

(defn present-chrome-log-file! []
  (if (:dirac-present-chrome-log-file-on-failure env)
    (with-travis-fold "Chrome logs" "chrome-logs"
      (let [debug-log-path (:chrome-log-file env)
            max-lines (get-transcript-max-chrome-log-lines)
            command ["tail" "-n" (str max-lines) debug-log-path]]
        (try
          (let [result (apply sh command)]
            (println)
            (println chrome-log-file-separator-start)
            (println "> " (apply str (interpose " " command)))
            (println (post-process-chrome-log-result (:out result)))
            (println chrome-log-file-separator-end)
            (println))
          (catch Throwable e
            (println)
            (println chrome-log-file-separator-start)
            (println (str "Unable to read Chrome log file at '" debug-log-path "'"))
            (stacktrace/print-stack-trace e)
            (println chrome-log-file-separator-end)
            (println)))))))

; -- transcript comparison --------------------------------------------------------------------------------------------------

(defn write-transcript-and-compare! []
  (let [test-name *current-transcript-test*
        suite-name *current-transcript-suite*]
    (try
      (when-let [logs (extract-javascript-logs)]
        (println)
        (println (str "*************** JAVASCRIPT LOGS ***************\n" logs))
        (println))
      (let [actual-transcript (get-canonical-transcript (obtain-transcript!))
            actual-transcript-path (get-actual-transcript-path suite-name test-name)]
        (write-transcript! actual-transcript-path actual-transcript)
        (let [expected-transcript-path (get-expected-transcript-path suite-name test-name)
              expected-transcript (get-canonical-transcript (slurp expected-transcript-path))]
          (if (compare-transcripts! test-name
                                    actual-transcript
                                    expected-transcript
                                    actual-transcript-path
                                    expected-transcript-path)
            (do-report {:type    :pass
                        :message (str (get-transcript-test-label test-name) " passed.")})
            (do
              (present-chrome-log-file!)
              (do-report {:type     :fail
                          :message  (str (get-transcript-test-label test-name) " failed to match expected transcript.")
                          :expected (str "to match expected transcript " expected-transcript-path)
                          :actual   (str "didn't match, see " actual-transcript-path)})))))
      (catch Throwable e
        (present-chrome-log-file!)
        (do-report {:type     :fail
                    :message  (str (get-transcript-test-label test-name) " failed with an exception.")
                    :expected "no exception"
                    :actual   (str e)})
        (stacktrace/print-stack-trace e)))))

; -- test selection ---------------------------------------------------------------------------------------------------------

(defn get-current-test-full-name []
  (let [test-name *current-transcript-test*
        suite-name *current-transcript-suite*]
    (str suite-name "-" test-name)))

(defn should-skip-current-test? []
  (boolean
    (if-let [filter-string (get-browser-test-filter)]
      (let [filtered-test-names (string/split filter-string #"\s")
            full-test-name (get-current-test-full-name)]
        (not (some #(string/includes? full-test-name %) filtered-test-names))))))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn execute-transcript-test! [test-name]
  (with-transcript-test test-name
    (let [full-name (get-current-test-full-name)]
      (if (should-skip-current-test?)
        (println (str "Skipped task '" full-name "' due to filter '" (get-browser-test-filter) "'"))
        (let [task-state (make-task-state)
              signal-server (create-signal-server! task-state)]
          (with-travis-fold (str "Running task '" full-name "'") full-name
            (navigate-transcript-runner!)
            ; chrome driver needs some time to cooldown after disconnection
            ; to prevent random org.openqa.selenium.SessionNotCreatedException exceptions
            ; also we want to run our transcript test safely after debugger port is available
            ; for devtools after driver disconnection
            (launch-transcript-test-after-delay! (get-script-runner-launch-delay))
            (wait-for-signal! signal-server task-state))
          (Thread/sleep (get-task-disconnected-wait-timeout))
          (write-transcript-and-compare!))))))
