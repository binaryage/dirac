(ns dirac.tests.browser.tasks.helpers
  (:require [clojure.string :as string]
            [clojure.java.shell :as shell]
            [clojure.tools.logging :as log]
            [clj-webdriver.taxi :as taxi]
            [environ.core :refer [env]]
            [cuerdas.core :as cuerdas]
            [clansi]
            [dirac.utils :as utils]
            [dirac.settings :refer [get-launch-task-message
                                    get-kill-task-message
                                    get-actual-transcripts-root-path
                                    get-expected-transcripts-root-path
                                    get-fixtures-server-port
                                    get-fixtures-server-url]]
            [dirac.test-lib.chrome-driver :refer [get-debugging-port]])
  (:import [java.net URLEncoder]))

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
  (env :dirac-browser-test-filter))

(def env-to-be-exported #{:dirac-agent-host
                          :dirac-agent-port
                          :dirac-agent-verbose
                          :dirac-weasel-auto-reconnect
                          :dirac-weasel-verbose})

(defn extract-dirac-env-config-as-url-params [env]
  (let [dirac-pattern #"^dirac-(.*)$"
        relevant-config (into {} (filter (fn [[key _val]] (some #{key} env-to-be-exported)) env))
        strip-prefix (fn [key] (second (re-find dirac-pattern (name key))))
        build-param (fn [key value] (str (URLEncoder/encode key) "=" (URLEncoder/encode value)))]
    (string/join "&" (map (fn [[key val]] (build-param (str "set-" (strip-prefix key)) val)) relevant-config))))

(defn make-test-runner-url [suite-name test-name]
  (let [debugging-port (get-debugging-port)
        extra-params (extract-dirac-env-config-as-url-params env)
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
