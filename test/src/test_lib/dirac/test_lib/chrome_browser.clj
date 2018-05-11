(ns dirac.test-lib.chrome-browser
  (:require [clj-webdriver.taxi :as taxi]
            [clojure.tools.logging :as log]
            [dirac.shared.travis :refer [with-travis-fold]]
            [dirac.test-lib.chrome-driver :as chrome-driver]))

; -- chrome info ------------------------------------------------------------------------------------------------------------

(defn print-chrome-info! []
  (if-some [chrome-info (chrome-driver/retrieve-chrome-info)]
    (log/info (str "== CHROME INFO ============================================================================\n"
                   chrome-info "---"))
    (do
      (log/error "unable to retrieve chrome info")
      (System/exit 2))))

(defn steal-debugging-port! []
  (if-some [debug-port (chrome-driver/retrieve-remote-debugging-port)]
    (chrome-driver/set-debugging-port! debug-port)
    (do
      (log/error "unable to retrieve-remote-debugging-port")
      (System/exit 1))))

; -- driver api -------------------------------------------------------------------------------------------------------------

(defn prepare-driver! []
  (if-some [driver (chrome-driver/prepare-chrome-driver (chrome-driver/prepare-options))]
    (taxi/set-driver! driver)
    (System/exit 4)))

(defn start-browser! []
  (log/debug "start-browser!")
  (prepare-driver!)
  (steal-debugging-port!)
  (print-chrome-info!))

(defn stop-browser! []
  (log/debug "stop-browser!")
  (taxi/quit))

(defn with-browser [f]
  (with-travis-fold "Start Chrome" "start-browser"
    (start-browser!))
  (f)
  (with-travis-fold "Stop Chrome" "stop-browser"
    (stop-browser!)))
