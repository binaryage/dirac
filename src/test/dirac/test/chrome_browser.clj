(ns dirac.test.chrome-browser
  (:require [clojure.core.async :refer [timeout <!!]]
            [clojure.core.async.impl.protocols :refer [closed?]]
            [clj-webdriver.taxi :refer :all]
            [clj-webdriver.driver :refer [init-driver]]
            [environ.core :refer [env]]
            [dirac.settings :refer [get-browser-connection-minimal-cooldown]]
            [dirac.test.chrome-driver :as chrome-driver]
            [clojure.tools.logging :as log]
            [clojure.java.shell :refer [sh]]
            [clojure.string :as string]))

(def connection-cooldown-channel (atom nil))
(def user-data-dir (atom nil))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-connection-cooldown []
  @connection-cooldown-channel)

(defn set-connection-cooldown! [channel]
  (reset! connection-cooldown-channel channel))

(defn clear-connection-cooldown! []
  (set-connection-cooldown! nil))

(defn get-user-data-dir []
  @user-data-dir)

(defn set-user-data-dir! [dir]
  (reset! user-data-dir dir))

(defn extract-user-data-dir [chrome-info]
  (if-let [m (re-find #"--user-data-dir=(.*) " chrome-info)]
    (second m)))

; -- high-level api ---------------------------------------------------------------------------------------------------------

(defn start-browser! []
  (log/debug "start-browser!")
  (let [driver (chrome-driver/prepare-chrome-driver (chrome-driver/prepare-options))]
    (set-driver! driver)
    (if-let [debug-port (chrome-driver/retrieve-remote-debugging-port)]
      (chrome-driver/set-debugging-port! debug-port)
      (do
        (log/error "unable to retrieve-remote-debugging-port")
        (System/exit 1)))
    (if-let [chrome-info (chrome-driver/retrieve-chrome-info)]
      (if-let [user-data-dir (extract-user-data-dir chrome-info)]
        (do
          (set-user-data-dir! user-data-dir)
          (log/info (str "== CHROME INFO ============================================================================\n"
                         chrome-info)))
        (do
          (log/error "unable to retrieve --user-data-dir from\n" chrome-info)
          (System/exit 3)))
      (do
        (log/error "unable to retrieve chrome info")
        (System/exit 2)))))

(defn stop-browser! []
  ; Cannot call driver's quit because it does not work well with our reconnection strategy (when using debuggerAddress option)
  ; Reconnected chrome driver loses ability to quit chrome browser properly for some reason.
  ; Instead we kill all processes which match user-data-dir passed as a command-line parameter.
  ; For this to work we assume that each new chrome browser instance gets an unique directory pointing to some temp folder.
  ; This is at least the case with Chrome Driver 2.21.371459 on Mac.
  (log/debug "stop-browser!")
  (let [user-data-dir (get-user-data-dir)
        command ["-f" user-data-dir]]                                                                                         ; this may be an over kill because we match also Chrome's helper processes
    (assert user-data-dir)
    (log/debug "killing browser instance with " command)
    (log/debug "candidate pids:" (string/join ", " (string/split (:out (apply sh "pgrep" command)) #"\n")))
    (let [result (apply sh "pkill" command)]
      (if-not (empty? (:out result))
        (log/info (:out result)))
      (if-not (empty? (:err result))
        (log/error "shell command" command "failed to execute:" (:err result))))))

(defn wait-for-reconnection-cooldown! []
  (when-let [cooldown-channel (get-connection-cooldown)]
    (when-not (closed? cooldown-channel)
      (log/info "waiting for connection to cool down...")
      (<!! cooldown-channel))
    (clear-connection-cooldown!)))

(defn disconnect-browser! []
  (wait-for-reconnection-cooldown!)
  (when-let [service (chrome-driver/get-current-chrome-driver-service)]
    (.stop service)
    (chrome-driver/set-current-chrome-driver-service! nil)
    (set-connection-cooldown! (timeout (get-browser-connection-minimal-cooldown)))))

(defn reconnect-browser! []
  (wait-for-reconnection-cooldown!)
  (let [options (assoc (chrome-driver/prepare-options true) :debugger-port (chrome-driver/get-debugging-port))]
    (set-driver! (chrome-driver/prepare-chrome-driver options))))
