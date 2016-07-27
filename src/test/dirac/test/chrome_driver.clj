(ns dirac.test.chrome-driver
  (:require [environ.core :refer [env]]
            [clj-webdriver.taxi :refer :all]
            [clj-webdriver.driver :refer [init-driver]]
            [clojure.string :as string]
            [clojure.java.io :as io]
            [clojure.core.async :refer [timeout <!!]]
            [clojure.core.async.impl.protocols :refer [closed?]]
            [clj-time.local :as time-local]
            [dirac.settings :refer [get-script-runner-launch-delay]]
            [clojure.tools.logging :as log])
  (:import (org.openqa.selenium.chrome ChromeDriver ChromeOptions ChromeDriverService$Builder)
           (org.openqa.selenium.logging LoggingPreferences LogType)
           (org.openqa.selenium.remote DesiredCapabilities CapabilityType)
           (java.nio.file Paths)
           (java.util.logging Level)
           (java.util Date)))

(def ^:const CHROME_VERSION_PAGE "chrome://version")

(def known-env-options [:travis
                        :chrome-driver-path
                        :dirac-root
                        :dirac-dev
                        :dirac-host-os
                        :dirac-use-chromium
                        :dirac-chrome-driver-verbose
                        :dirac-chrome-driver-browser-log-level])

(def current-chrome-driver-service (atom nil))
(def current-chrome-remote-debugging-port (atom nil))
(def current-chrome-driver (atom nil))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-debugging-port []
  @current-chrome-remote-debugging-port)

(defn set-debugging-port! [port]
  (reset! current-chrome-remote-debugging-port port))

(defn get-current-chrome-driver-service []
  @current-chrome-driver-service)

(defn set-current-chrome-driver-service! [service]
  (reset! current-chrome-driver-service service))

(defn get-current-chrome-driver []
  @current-chrome-driver)

(defn set-current-chrome-driver! [driver]
  (reset! current-chrome-driver driver))

(defn get-dirac-extension-path [dirac-root dev?]
  (if dev?
    [dirac-root "resources" "unpacked"]
    [dirac-root "resources" "release"]))

(defn get-marion-extension-path [dirac-root]
  [dirac-root "test" "marion" "resources" "unpacked"])                                                                        ; note: we always use dev version, it is just a helper extension, no need for advanced compliation here

(defn pick-chrome-binary-path [options]
  (let [{:keys [dirac-use-chromium dirac-host-os]} options]
    (if dirac-use-chromium
      (case dirac-host-os
        "Mac OS X" "/Applications/Chromium.app/Contents/MacOS/Chromium"
        nil)
      (case dirac-host-os
        "Mac OS X" "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
        "Linux" "/usr/bin/google-chrome-unstable"
        nil))))

(defn beautify-command-line [raw-command-line-text]
  (string/join (interpose " \\\n                     --" (string/split raw-command-line-text #" --"))))

(defn extract-javascript-log-lines [driver]
  {:pre [driver]}
  (let [entries (.get (.logs (.manage driver)) LogType/BROWSER)]
    (for [entry entries]
      (let [time (Date. (.getTimestamp entry))
            display-time (time-local/format-local-time time :hour-minute-second-ms)
            message (.getMessage entry)]
        (str display-time " | " message)))))

(defn extract-javascript-logs []
  (if-let [driver (get-current-chrome-driver)]
    (let [lines (extract-javascript-log-lines driver)]
      (if-not (empty? lines)
        (string/join "\n" lines)))))

(defn parse-log-level [level-str]
  (if (empty? level-str)
    Level/OFF
    (try
      (Level/parse level-str)
      (catch Exception e
        (log/error (str "unable to parse log level: " level-str ". " e))
        Level/OFF))))

; -- chrome driver / service ------------------------------------------------------------------------------------------------

(defn build-chrome-driver-service [options]
  (let [{:keys [port dirac-chrome-driver-verbose chrome-driver-path]} options
        builder (ChromeDriverService$Builder.)]
    (if chrome-driver-path
      (let [chrome-driver-exe (io/file chrome-driver-path)]
        (log/debug (str "setting chrome driver path to '" chrome-driver-exe "'"))
        (.usingDriverExecutable builder chrome-driver-exe)))
    (.withVerbose builder (boolean dirac-chrome-driver-verbose))
    (if port
      (.usingPort builder port)
      (.usingAnyFreePort builder))
    (.build builder)))

(defn prepare-chrome-logging-preferences [options]
  (let [logging-prefs (LoggingPreferences.)]
    (.enable logging-prefs LogType/BROWSER (parse-log-level (:dirac-chrome-driver-browser-log-level options)))
    logging-prefs))

(defn tweak-os-specific-options [chrome-options options]
  (when-not (:attaching? options)
    (when-let [chrome-binary-path (pick-chrome-binary-path options)]
      (log/debug (str "setting chrome binary path to '" chrome-binary-path "'"))
      (.setBinary chrome-options chrome-binary-path))))

(defn tweak-travis-specific-options [chrome-options options]
  (when (:travis options)
    (.addArguments chrome-options ["--disable-setuid-sandbox"])))

(defn prepare-chrome-options [options]
  (let [{:keys [attaching? dirac-root dirac-dev debugger-port]} options
        chrome-options (ChromeOptions.)
        extension-paths [(get-dirac-extension-path dirac-root dirac-dev)
                         (get-marion-extension-path dirac-root)]
        absolute-extension-paths (map #(.toAbsolutePath (Paths/get "" (into-array String %))) extension-paths)
        load-extensions-arg (str "load-extension=" (string/join "," absolute-extension-paths))
        args [; we need robust startup, chrome tends to display first-run dialogs on clean systems and blocks the driver
              ; but there are still some bugs: https://bugs.chromium.org/p/chromium/issues/detail?id=348426
              "--disable-hang-monitor"
              "--disable-prompt-on-repost"
              "--dom-automation"
              "--full-memory-crash-report"
              "--no-default-browser-check"
              "--no-first-run"
              "--ignore-certificate-errors"
              "--homepage=about:blank"
              "--enable-experimental-extension-apis"
              "--disable-gpu"
              load-extensions-arg]]
    (.addArguments chrome-options args)

    (tweak-travis-specific-options chrome-options options)
    (tweak-os-specific-options chrome-options options)
    (if attaching?
      (.setExperimentalOption chrome-options "debuggerAddress" (str "127.0.0.1:" debugger-port))
      (.setExperimentalOption chrome-options "detach" true))
    chrome-options))

(defn prepare-chrome-caps [options]
  (let [caps (DesiredCapabilities/chrome)
        chrome-options (prepare-chrome-options options)
        chrome-logging-preferences (prepare-chrome-logging-preferences options)]
    (.setCapability caps ChromeOptions/CAPABILITY chrome-options)
    (.setCapability caps CapabilityType/LOGGING_PREFS chrome-logging-preferences)
    caps))

(defn prepare-chrome-driver [options]
  (let [chrome-driver-service (build-chrome-driver-service options)
        chrome-caps (prepare-chrome-caps options)
        chrome-driver (ChromeDriver. chrome-driver-service chrome-caps)]
    (set-current-chrome-driver-service! chrome-driver-service)
    (set-current-chrome-driver! chrome-driver)
    (init-driver chrome-driver)))

(defn prepare-options
  ([] (prepare-options false))
  ([attaching?]
   (let [defaults {:dirac-host-os                         (System/getProperty "os.name")
                   :dirac-chrome-driver-browser-log-level "SEVERE"}
         env-settings (select-keys env known-env-options)
         ; when testing with travis we place chrome driver binary under test/chromedriver
         ; detect that case here and use the binary explicitely
         dirac-test-chromedriver-file (io/file (:dirac-root env-settings) "test" "chromedriver")
         chrome-driver-path (if (.exists dirac-test-chromedriver-file)
                              {:chrome-driver-path (.getAbsolutePath dirac-test-chromedriver-file)})
         overrides {:attaching? attaching?}]
     (merge defaults env-settings chrome-driver-path overrides))))

(defn retrieve-remote-debugging-port []
  (try
    (to CHROME_VERSION_PAGE)
    (wait-until #(exists? "#executable_path"))
    (let [body-text (text "body")]
      (when-let [m (re-find #"--remote-debugging-port=(\d+)" body-text)]
        (Integer/parseInt (second m))))
    (catch Exception e
      (log/error (str "got an exception when trying to retrieve remote debugging port:\n" e))
      nil)))

(defn retrieve-chrome-info []
  (try
    (to CHROME_VERSION_PAGE)
    (wait-until #(exists? "#executable_path"))
    (let [version-text (text "#version")
          os-type-text (text "#os_type")
          js-engine-text (text "#js_engine")
          command-line-text (text "#command_line")
          executable-path-text (text "#executable_path")]
      (str "    Google Chrome: " version-text "\n"
           "               OS: " os-type-text "\n"
           "       JavaScript: " js-engine-text "\n"
           "  Executable Path: " executable-path-text "\n"
           "     Command Line: " (beautify-command-line command-line-text) "\n"))
    (catch Exception e
      (log/error (str "got an exception when trying to retrieve chrome info:\n" e))
      nil)))
