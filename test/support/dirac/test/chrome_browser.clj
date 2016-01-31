(ns dirac.test.chrome-browser
  (:require [environ.core :refer [env]]
            [clj-webdriver.taxi :refer :all]
            [clj-webdriver.driver :refer [init-driver]]
            [clojure.string :as string]
            [clojure.java.io :as io])
  (:import (org.openqa.selenium.chrome ChromeDriver ChromeOptions ChromeDriverService$Builder)
           (org.openqa.selenium.remote RemoteWebDriver DesiredCapabilities)
           (java.nio.file Paths)))

(def current-chrome-driver-service (atom nil))
(def current-chrome-remote-debugging-port (atom nil))

(defn build-chrome-driver-service [options]
  (let [{:keys [port verbose chrome-driver-path]} options
        builder (ChromeDriverService$Builder.)]
    (if chrome-driver-path
      (let [chrome-driver-exe (io/file chrome-driver-path)]
        (println (str "setting chrome driver path to '" chrome-driver-exe "'"))
        (.usingDriverExecutable builder chrome-driver-exe)))
    (.withVerbose builder (boolean verbose))
    (if port
      (.usingPort builder port)
      (.usingAnyFreePort builder))
    (.build builder)))

(defn prepare-caps [attaching? options]
  (let [caps (DesiredCapabilities/chrome)
        chrome-options (ChromeOptions.)
        dirac-root (:dirac-root options)
        extension-paths [[dirac-root "resources" "unpacked"]
                         [dirac-root "test" "marion" "resources" "unpacked"]]
        absolute-extension-paths (map #(.toAbsolutePath (Paths/get "" (into-array String %))) extension-paths)
        load-extensions-arg (str "load-extension=" (string/join "," absolute-extension-paths))
        args ["--enable-experimental-extension-apis"
              "--no-first-run"
              load-extensions-arg]]
    ;(.setBinary chrome-options "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary")
    (if attaching?
      (.setExperimentalOption chrome-options "debuggerAddress" (str "127.0.0.1:" (:debugger-port options)))
      (.setExperimentalOption chrome-options "detach" true))
    (.addArguments chrome-options args)
    (when (:travis options)
      (.addArguments chrome-options ["--disable-setuid-sandbox"]))
    (.setCapability caps ChromeOptions/CAPABILITY chrome-options)
    caps))

(defn prepare-chrome-driver [attaching? options]
  (let [service (build-chrome-driver-service options)
        caps (prepare-caps attaching? options)
        chrome-driver (ChromeDriver. service caps)]
    (reset! current-chrome-driver-service service)
    (init-driver chrome-driver)))

(defn prepare-options []
  (let [env-settings (select-keys env [:dirac-root :travis :chrome-driver-path])
        dirac-root (:dirac-root env-settings)
        dirac-test-chromedriver-file (io/file dirac-root "test" "chromedriver")
        overrides (if (.exists dirac-test-chromedriver-file)
                    {:chrome-driver-path (.getAbsolutePath dirac-test-chromedriver-file)})]
    (merge env-settings overrides {;:port    8222
                                   :verbose false})))

(defn retrieve-remote-debugging-port []
  (to "chrome://version")
  (let [body-text (text "body")]
    (when-let [m (re-matches #"(?s).*--remote-debugging-port=(\d+).*" body-text)]
      (Integer/parseInt (second m)))))

(defn start-browser! []
  (set-driver! (prepare-chrome-driver false (prepare-options)))
  (if-let [debug-port (retrieve-remote-debugging-port)]
    (reset! current-chrome-remote-debugging-port debug-port)
    (do
      (println "unable toretrieve-remote-debugging-port")
      (System/exit 1))))

(defn disconnect-browser! []
  {:pre [@current-chrome-driver-service]}
  (.stop @current-chrome-driver-service)
  (Thread/sleep 1000))

(defn reconnect-browser! []
  (let [debugger-port @current-chrome-remote-debugging-port
        options (assoc (prepare-options)
                  :debugger-port debugger-port)]
    (set-driver! (prepare-chrome-driver true options))))

(defn stop-browser! []
  (quit))

(defn with-chrome-browser [f]
  (start-browser!)
  (f)
  (stop-browser!))