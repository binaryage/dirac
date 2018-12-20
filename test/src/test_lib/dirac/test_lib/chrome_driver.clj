(ns dirac.test-lib.chrome-driver
  (:require [clj-time.local :as time-local]
            [clj-webdriver.driver :refer [init-driver]]
            [clj-webdriver.taxi :refer :all]
            [clojure.core.async :refer [<!! timeout]]
            [clojure.core.async.impl.protocols :refer [closed?]]
            [clojure.java.io :as io]
            [clojure.string :as string]
            [clojure.tools.logging :as log]
            [clojure.stacktrace :as stacktrace]
            [dirac.settings :refer [get-script-runner-launch-delay]]
            [environ.core :refer [env]])
  (:import (java.util Date)
           (java.util.logging Level)
           (org.openqa.selenium.chrome ChromeDriver ChromeDriverService$Builder ChromeOptions)
           (org.openqa.selenium.logging LoggingPreferences LogType)
           (org.openqa.selenium.remote CapabilityType DesiredCapabilities)
           (java.io File)))

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
  (let [port @current-chrome-remote-debugging-port]
    (assert (pos? port))
    port))

(defn set-debugging-port! [port]
  (reset! current-chrome-remote-debugging-port port))

(defn set-current-chrome-driver-service! [service]
  (reset! current-chrome-driver-service service))

(defn get-current-chrome-driver []
  @current-chrome-driver)

(defn set-current-chrome-driver! [driver]
  (reset! current-chrome-driver driver))

(defn canonical-path [path]
  (-> (io/as-file path)
      (.getCanonicalPath)))

(defn get-dirac-extension-path [dirac-root dev?]
  (->> (if dev?
         [dirac-root "resources" "unpacked"]
         [dirac-root "resources" "release"])
       (string/join File/separator)
       (canonical-path)))

(defn get-marion-extension-path [dirac-root]
  (->> [dirac-root "test" "marion" "resources" "unpacked"]                                                                    ; note: we always use dev version, it is just a helper extension, no need for advanced compliation here
       (string/join File/separator)
       (canonical-path)))

(defn retrieve-chromedriver-log []
  (if-some [log-path (:chrome-driver-log-path env)]
    (if (.exists (io/as-file log-path))
      (str "chromedriver log at '" log-path "):\n" (slurp log-path))
      (str "no chromedriver log available at '" log-path "'"))
    ":chrome-driver-log-path not specified"))

(defn print-chromedriver-log! []
  (println (retrieve-chromedriver-log)))

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

(defn prepare-chrome-options [options]
  (let [{:keys [attaching? dirac-root dirac-dev debugger-port]} options
        chrome-options (ChromeOptions.)
        extension-paths [(get-dirac-extension-path dirac-root dirac-dev)
                         (get-marion-extension-path dirac-root)]
        load-extensions-arg (str "load-extension=" (string/join "," extension-paths))
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
              "--v=0"
              "--no-sandbox"
              "--disable-setuid-sandbox"                                                                                      ; for docker container https://eshlox.net/2016/11/22/dockerize-behave-selenium-tests/
              load-extensions-arg]]
    (.addArguments chrome-options args)

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
  (try
    (let [chrome-driver-service (build-chrome-driver-service options)
          chrome-caps (prepare-chrome-caps options)
          chrome-driver (ChromeDriver. chrome-driver-service chrome-caps)]
      (set-current-chrome-driver-service! chrome-driver-service)
      (set-current-chrome-driver! chrome-driver)
      (init-driver chrome-driver))
    (catch Exception e
      (log/error (str "got an exception when trying to prepare chrome driver:\n"
                      (with-out-str (stacktrace/print-stack-trace e))))
      (print-chromedriver-log!)
      nil)))

(defn prepare-options
  ([] (prepare-options false))
  ([attaching?]
   (let [defaults {:dirac-root                            (System/getProperty "user.dir")
                   :dirac-host-os                         (System/getProperty "os.name")
                   :dirac-chrome-driver-browser-log-level "SEVERE"}
         env-settings (select-keys env known-env-options)
         overrides {:attaching? attaching?}]
     (merge defaults env-settings overrides))))

(defn extract-user-data-dir-from-command-line [command-line]
  (or
    ; TODO: following regex will likely fail when user-data-dir contains spaces in file path
    ; chromedriver generates temp files without spaces, e.g. something like
    ; --user-data-dir=/tmp/.org.chromium.Chromium.6or3DA
    ; so we can be lazy here
    (if-some [match (re-find #"--user-data-dir=(.+?)\s" command-line)]
      (if-some [dir (second match)]
        (if-not (empty? dir)
          dir)))
    (throw (ex-info (str "unable to extract --user-data-dir from " CHROME_VERSION_PAGE "\n") {:command-line command-line}))))

(defn retrieve-remote-debugging-port-via-file [command-line]
  ; see devtools_http_handler.cc
  ; https://chromium.googlesource.com/chromium/src/+/master/content/browser/devtools/devtools_http_handler.cc
  (let [data-dir (extract-user-data-dir-from-command-line command-line)
        port-file-path (str data-dir "/" "DevToolsActivePort")]
    (try
      (let [port-file-content (slurp port-file-path)
            lines (string/split-lines port-file-content)]
        (assert (>= (count lines) 2))
        (let [port (Integer/parseInt (first lines))]
          (if-not (zero? port)
            port
            (throw (ex-info (str "unexpected zero port in '" port-file-path "'") nil)))))
      (catch Throwable e
        (throw (ex-info (str "unable to parse port from '" port-file-path "'\n" (.getMessage e) "\n")
                        {:command-line command-line}))))))

(defn retrieve-remote-debugging-port []
  (try
    (to CHROME_VERSION_PAGE)
    (wait-until #(exists? "#command_line") 3000)
    (let [command-line (text "#command_line")]
      (if-let [match (re-find #"--remote-debugging-port=(\d+)" command-line)]
        (let [port (Integer/parseInt (second match))]
          (if-not (zero? port)                                                                                                ; see https://chromium.googlesource.com/chromium/src/+/fbc89a4a08a9929b8d1ee64e0cee1c5111d4e884
            port
            (retrieve-remote-debugging-port-via-file command-line)))
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
