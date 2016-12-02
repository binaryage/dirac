(ns dirac.test-lib.chrome-driver
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
                        :chrome-driver-log-path
                        :dirac-root
                        :dirac-dev
                        :dirac-host-os
                        :dirac-use-chromium
                        :dirac-chrome-binary-path
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

(defn slurp-chromedriver-log-if-avail []
  (if-let [log-path (:chrome-driver-log-path env)]
    (str "chromedriver log (" log-path "):\n" (slurp log-path))
    "no chromedriver log available"))

(defn print-chromedriver-log! []
  (println (slurp-chromedriver-log-if-avail)))

(defn pick-chrome-binary-path [options]
  (let [{:keys [dirac-chrome-binary-path dirac-use-chromium dirac-host-os]} options]
    (cond
      (some? dirac-chrome-binary-path) dirac-chrome-binary-path
      dirac-use-chromium (case dirac-host-os
                           "Mac OS X" "/Applications/Chromium.app/Contents/MacOS/Chromium"
                           nil)
      :else (case dirac-host-os
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
  (let [{:keys [port dirac-chrome-driver-verbose chrome-driver-path chrome-driver-log-path]} options
        builder (ChromeDriverService$Builder.)]
    (when chrome-driver-log-path
      (log/debug (str "setting chrome driver log path to '" chrome-driver-log-path "'"))
      (System/setProperty "webdriver.chrome.logfile" chrome-driver-log-path))
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
              ;"--disable-application-cache"
              ;"--log-net-log=target/net.log"
              ;"--enable-extension-activity-logging "
              "--disable-hang-monitor"
              "--disable-prompt-on-repost"
              "--dom-automation"
              "--full-memory-crash-report"
              "--no-default-browser-check"
              "--no-first-run"
              "--ignore-certificate-errors"
              "--homepage=about:blank"
              "--enable-experimental-extension-apis"
              "--dns-prefetch-disable"                                                                                        ; https://bugs.chromium.org/p/chromedriver/issues/detail?id=848#c10
              "--disable-gpu"
              "--disable-infobars"
              "--disable-default-apps"
              "--noerrdialogs"
              "--enable-logging"
              "--v=1"
              "--no-sandbox"
              "--disable-setuid-sandbox"                                                                                      ; for docker container https://eshlox.net/2016/11/22/dockerize-behave-selenium-tests/
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
         overrides {:attaching? attaching?}]
     (merge defaults env-settings overrides))))

(defn retrieve-remote-debugging-port []
  (try
    (to CHROME_VERSION_PAGE)
    (wait-until #(exists? "#command_line") 3000)
    (let [command-line (text "#command_line")]
      (if-let [m (re-find #"--remote-debugging-port=(\d+)" command-line)]
        (Integer/parseInt (second m))
        (throw (ex-info (str "no --remote-debugging-port found in " CHROME_VERSION_PAGE "\n") {:command-line command-line}))))
    (catch Exception e
      (log/error (str "got an exception when trying to retrieve remote debugging port:\n" e))
      (print-chromedriver-log!)
      nil)))

(defn retrieve-chrome-info []
  (try
    (to CHROME_VERSION_PAGE)
    (wait-until #(exists? "#executable_path") 3000)
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
      (print-chromedriver-log!)
      nil)))
