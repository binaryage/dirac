(ns dirac.test.chrome-browser
  (:require [environ.core :refer [env]]
            [clj-webdriver.taxi :refer :all]
            [clj-webdriver.driver :refer [init-driver]]
            [clojure.string :as string]
            [clojure.java.io :as io])
  (:import (org.openqa.selenium.chrome ChromeDriver ChromeOptions ChromeDriverService$Builder)
           (org.openqa.selenium.remote DesiredCapabilities)
           (java.nio.file Paths)))

(def current-chrome-driver-service (atom nil))
(def current-chrome-remote-debugging-port (atom nil))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-debugging-port []
  @current-chrome-remote-debugging-port)

(defn set-debugging-port! [port]
  (reset! current-chrome-remote-debugging-port port))

(defn get-current-chrome-driver-service []
  @current-chrome-driver-service)

(defn set-current-chrome-driver-service! [service]
  (reset! current-chrome-driver-service service))

(defn log [& args]
  (apply println "Chrome Driver:" args))

(defn get-dirac-extension-path [dirac-root dev?]
  (if dev?
    [dirac-root "resources" "unpacked"]
    [dirac-root "resources" "release"]))

(defn get-marion-extension-path [dirac-root]
  [dirac-root "test" "marion" "resources" "unpacked"])                                                                        ; note: we always use dev version, it is just a helper extension, no need for advanced compliation here

(defn pick-chrome-binary-path [os]
  (case os
    "Mac OS X" "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
    "Linux" "/usr/bin/google-chrome-unstable"
    nil))

(defn print-current-driver-info []
  (if-let [service (get-current-chrome-driver-service)]
    (log (str "driver service info: " service))
    (log (str "driver service info: <no service>"))))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn build-chrome-driver-service [options]
  (let [{:keys [port dirac-chrome-driver-verbose chrome-driver-path]} options
        builder (ChromeDriverService$Builder.)]
    (if chrome-driver-path
      (let [chrome-driver-exe (io/file chrome-driver-path)]
        (log (str "setting chrome driver path to '" chrome-driver-exe "'"))
        (.usingDriverExecutable builder chrome-driver-exe)))
    (.withVerbose builder (boolean dirac-chrome-driver-verbose))
    (if port
      (.usingPort builder port)
      (.usingAnyFreePort builder))
    (.build builder)))

(defn tweak-os-specific-options [chrome-options options]
  (when-let [chrome-binary-path (pick-chrome-binary-path (:dirac-host-os options))]
    (log (str "setting chrome binary path to '" chrome-binary-path "'"))
    (.setBinary chrome-options chrome-binary-path)))

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
        chrome-options (prepare-chrome-options options)]
    (.setCapability caps ChromeOptions/CAPABILITY chrome-options)
    caps))

(defn prepare-chrome-driver [options]
  (let [chrome-driver-service (build-chrome-driver-service options)
        chrome-caps (prepare-chrome-caps options)
        chrome-driver (ChromeDriver. chrome-driver-service chrome-caps)]
    (set-current-chrome-driver-service! chrome-driver-service)
    (init-driver chrome-driver)))

(defn prepare-options
  ([]
   (prepare-options false))
  ([attaching?]
   (let [defaults {:dirac-host-os (System/getProperty "os.name")}
         env-settings (select-keys env [:dirac-root :travis :chrome-driver-path :dirac-dev :dirac-host-os
                                        :dirac-chrome-driver-verbose])
         ; when testing with travis we place chrome driver binary under test/chromedriver
         ; detect that case here and use the binary explicitely
         dirac-test-chromedriver-file (io/file (:dirac-root env-settings) "test" "chromedriver")
         chrome-driver-path (if (.exists dirac-test-chromedriver-file)
                              {:chrome-driver-path (.getAbsolutePath dirac-test-chromedriver-file)})
         overrides {:attaching? attaching?}]
     (merge defaults env-settings chrome-driver-path overrides))))

(defn retrieve-remote-debugging-port []
  (try
    (to "chrome://version")
    (let [body-text (text "body")]
      (when-let [m (re-matches #"(?s).*--remote-debugging-port=(\d+).*" body-text)]
        (Integer/parseInt (second m))))
    (catch Exception e
      (log (str "got an exception when trying to retrieve remote debugging port:\n" e))
      nil)))

; -- high-level api ---------------------------------------------------------------------------------------------------------

(defn start-browser! []
  (set-driver! (prepare-chrome-driver (prepare-options)))
  (if-let [debug-port (retrieve-remote-debugging-port)]
    (set-debugging-port! debug-port)
    (do
      (log "unable to retrieve-remote-debugging-port")
      (System/exit 1)))
  (print-current-driver-info))

(defn disconnect-browser! []
  (when-let [service (get-current-chrome-driver-service)]
    (.stop service)
    (set-current-chrome-driver-service! nil)
    (Thread/sleep 1000)))

(defn reconnect-browser! []
  (let [options (assoc (prepare-options true) :debugger-port (get-debugging-port))]
    (set-driver! (prepare-chrome-driver options))))

(defn stop-browser! []
  (quit))

(defn with-chrome-browser [f]
  (start-browser!)
  (f)
  (stop-browser!))