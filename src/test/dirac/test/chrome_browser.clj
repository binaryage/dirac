(ns dirac.test.chrome-browser
  (:require [clojure.core.async :refer [timeout <!!]]
            [clojure.core.async.impl.protocols :refer [closed?]]
            [clj-webdriver.taxi :refer :all]
            [clj-webdriver.driver :refer [init-driver]]
            [environ.core :refer [env]]
            [dirac.test.chrome-driver :as chrome-driver]))

(def ^:const BROWSER_CONNECTION_MINIMAL_COOLDOWN 4000)

(def connection-cooldown-channel (atom nil))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn log [& args]
  (apply println "chrome-browser:" args))

(defn get-connection-cooldown []
  @connection-cooldown-channel)

(defn set-connection-cooldown! [channel]
  (reset! connection-cooldown-channel channel))

(defn clear-connection-cooldown! []
  (set-connection-cooldown! nil))

; -- high-level api ---------------------------------------------------------------------------------------------------------

(defn start-browser! []
  (let [driver (chrome-driver/prepare-chrome-driver (chrome-driver/prepare-options))]
    (set-driver! driver)
    (if-let [debug-port (chrome-driver/retrieve-remote-debugging-port)]
      (chrome-driver/set-debugging-port! debug-port)
      (do
        (log "unable to retrieve-remote-debugging-port")
        (System/exit 1)))
    (if-let [chrome-info (chrome-driver/retrieve-chrome-info)]
      (log (str "== CHROME INFO ==============================================================================\n" chrome-info))
      (do
        (log "unable to retrieve-chrome-info")
        (System/exit 2)))))

(defn stop-browser! []
  #_(quit))

(defn with-chrome-browser [f]
  (try
    (start-browser!)
    (f)
    (finally
      (stop-browser!))))

(defn wait-for-reconnection-cooldown! []
  (when-let [cooldown-channel (get-connection-cooldown)]
    (when-not (closed? cooldown-channel)
      (log "waiting for connection to cool down...")
      (<!! cooldown-channel))
    (clear-connection-cooldown!)))

(defn disconnect-browser! []
  (wait-for-reconnection-cooldown!)
  (when-let [service (chrome-driver/get-current-chrome-driver-service)]
    (.stop service)
    (chrome-driver/set-current-chrome-driver-service! nil)
    (set-connection-cooldown! (timeout BROWSER_CONNECTION_MINIMAL_COOLDOWN))))

(defn reconnect-browser! []
  (wait-for-reconnection-cooldown!)
  (let [options (assoc (chrome-driver/prepare-options true) :debugger-port (chrome-driver/get-debugging-port))]
    (set-driver! (chrome-driver/prepare-chrome-driver options))))