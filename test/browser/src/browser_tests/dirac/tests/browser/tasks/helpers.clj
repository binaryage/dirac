(ns dirac.tests.browser.tasks.helpers
  (:require [clansi]
            [clj-webdriver.taxi :as taxi]
            [clojure.java.shell :as shell]
            [clojure.string :as string]
            [clojure.tools.logging :as log]
            [cuerdas.core :as cuerdas]
            [dirac.settings :refer [get-actual-transcripts-root-path
                                    get-expected-transcripts-root-path
                                    get-fixtures-server-port
                                    get-fixtures-server-url
                                    get-kill-task-message
                                    get-launch-task-message]]
            [dirac.shared.utils :as utils]
            [dirac.test-lib.chrome-driver :refer [get-debugging-port]]
            [environ.core :refer [env]]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn kill-task! []
  (let [script (str "window.postMessage({type:'" (get-kill-task-message) "'}, '*')")]
    (taxi/execute-script script)))

(defn launch-transcript-test-after-delay! [delay-ms]
  {:pre [(integer? delay-ms) (not (neg? delay-ms))]}
  (let [script (str "window.postMessage({type:'" (get-launch-task-message) "', delay: " delay-ms "}, '*')")]
    (taxi/execute-script script)))

(defn format-friendly-timeout [timeout-ms]
  (utils/timeout-display timeout-ms))

(defn navigation-timeout-message [_test-name load-timeout test-index-url]
  (str "failed to navigate to index page in time (" (utils/timeout-display load-timeout) "): " test-index-url))

(defn get-browser-test-filter []
  (env :dirac-setup-browser-test-filter))

(defn make-test-runner-url [suite-name test-name]
  (let [debugging-port (get-debugging-port)
        extra-params nil
        url (get-fixtures-server-url)]
    (str url "/runner.html?"
         "task=" suite-name "." test-name
         "&test_runner=1"
         "&debugging_port=" debugging-port
         (if extra-params (str "&" extra-params)))))

(defn under-ci? []
  (or (some? (:ci env)) (some? (:travis env))))

(defn enter-infinite-loop []
  (Thread/sleep 1000)
  (recur))

(defn pause-unless-ci []
  (when-not (under-ci?)
    (log/info "paused execution to allow inspection of failed task => CTRL+C to break")
    (enter-infinite-loop)))

(defn get-transcript-test-label [test-name]
  (str "Transcript test '" test-name "'"))

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

(defn append-nl [text]
  (str text "\n"))

(defn get-canonical-transcript [transcript]
  (->> transcript
       (cuerdas/lines)
       (map get-canonical-line)
       (filter significant-line?)                                                                                             ; filter empty lines to work around end-of-the-file new-line issue
       (cuerdas/unlines)
       (append-nl)))                                                                                                          ; we want to be compatible with "copy transcript!" button which copies to clipboard with extra new-line

(defn produce-diff [path1 path2]
  (let [options-args ["-U" "5"]
        paths-args [path1 path2]]
    (try
      (let [result (apply shell/sh "colordiff" (concat options-args paths-args))]
        (if-not (empty? (:err result))
          (clansi/style (str "! " (:err result)) :red)
          (:out result)))
      (catch Throwable e
        (clansi/style (str "! " (.getMessage e)) :red)))))
