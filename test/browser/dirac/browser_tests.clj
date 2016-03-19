(ns dirac.browser-tests
  (:require [clojure.test :refer :all]
            [clojure.java.io :as io]
            [dirac.test.fixtures-web-server :refer [with-fixtures-web-server]]
            [dirac.test.chrome-browser :refer [with-chrome-browser disconnect-browser! reconnect-browser! get-debugging-port]]
            [dirac.lib.ws-server :as server]
            [clj-webdriver.taxi :refer :all]
            [clojure.string :as string]
            [clojure.java.shell :as shell]))

; note: we expect current working directory to be dirac root directory ($root)
; $root/test/browser/transcripts/expected/*.txt should contain expected transcripts

(def actual-transcripts-root-path "test/browser/transcripts/actual/")
(def expected-transcripts-root-path "test/browser/transcripts/expected/")

(defn navigate-transcript-test! [name]
  (let [debugging-port (get-debugging-port)
        test-url (str "http://localhost:9090/" name "/resources/index.html?debugging_port=" debugging-port)]
    (println "navigating to" test-url)
    (to test-url)))

(defn wait-for-task-to-finish []
  (let [server (server/create! {:name "Task signaller"
                                :host "localhost"
                                :port 22555})
        server-url (server/get-url server)]
    (println (str "Waiting for task signals at " server-url "."))
    (server/wait-for-first-client server)))

; -- transcript helpers -----------------------------------------------------------------------------------------------------

(defn get-actual-transcript-path [name]
  (str actual-transcripts-root-path name ".txt"))

(defn get-expected-transcript-path [name]
  (str expected-transcripts-root-path name ".txt"))

(defn normalize-transcript [transcript]
  (-> transcript
      (string/trim)))

(defn obtain-transcript []
  (text "pre.transcript"))

(defn write-transcript-and-compare [name]
  (let [actual-transcript (normalize-transcript (obtain-transcript))
        actual-path (get-actual-transcript-path name)]
    (io/make-parents actual-path)
    (spit actual-path actual-transcript)
    (let [expected-path (get-expected-transcript-path name)
          expected-transcript (normalize-transcript (slurp expected-path))]
      (if-not (= actual-transcript expected-transcript)
        (do
          (println)
          (println "-------------------------------------------------------------------------------------------------------")
          (println "! expected and actual transcripts differ for" name "test:")
          (println (str "> diff expected/" name ".txt actual/" name ".txt"))
          (println (:out (shell/sh "diff" "-U" "5" expected-path actual-path)))
          false)
        true))))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(use-fixtures :once with-chrome-browser with-fixtures-web-server)

; -- individual tests -------------------------------------------------------------------------------------------------------

(deftest fixtures-web-server-check
  (to "http://localhost:9090")
  (is (= (text "body") "fixtures web-server ready")))

(deftest p01
  (navigate-transcript-test! "p01")
  (disconnect-browser!)
  (wait-for-task-to-finish)
  (reconnect-browser!)
  (is (write-transcript-and-compare "p01")))