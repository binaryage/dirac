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

(defn get-dirac-extension-path [dirac-root dev?]
  (if dev?
    [dirac-root "resources" "unpacked"]
    [dirac-root "resources" "release"]))

(defn get-marion-extension-path [dirac-root]
  [dirac-root "test" "marion" "resources" "unpacked"])                                                                        ; note: we always use dev version, it is just a helper extension, no need for advanced compliation here

(defn prepare-caps [attaching? options]
  (let [{:keys [dirac-root dirac-dev travis debugger-port]} options
        caps (DesiredCapabilities/chrome)
        chrome-options (ChromeOptions.)
        extension-paths [(get-dirac-extension-path dirac-root dirac-dev)
                         (get-marion-extension-path dirac-root)]
        absolute-extension-paths (map #(.toAbsolutePath (Paths/get "" (into-array String %))) extension-paths)
        load-extensions-arg (str "load-extension=" (string/join "," absolute-extension-paths))
        args ["--enable-experimental-extension-apis"
              "--no-first-run"
              load-extensions-arg]]
    (if attaching?
      (.setExperimentalOption chrome-options "debuggerAddress" (str "127.0.0.1:" debugger-port))
      (.setExperimentalOption chrome-options "detach" true))
    (.addArguments chrome-options args)
    (when travis
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
  (let [env-settings (select-keys env [:dirac-root :travis :chrome-driver-path :dirac-dev])
        ; when testing with travis we place chrome driver binary under test/chromedriver
        ; detect that case here and use the binary explicitely
        dirac-test-chromedriver-file (io/file (:dirac-root env-settings) "test" "chromedriver")
        overrides (if (.exists dirac-test-chromedriver-file)
                    {:chrome-driver-path (.getAbsolutePath dirac-test-chromedriver-file)})]
    (merge env-settings overrides {:verbose false})))

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
      (println "unable to retrieve-remote-debugging-port")
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