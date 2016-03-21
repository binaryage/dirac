(ns dirac.test.nrepl-server
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.test :refer :all]
            [dirac.test.nrepl-server-helpers :refer [start-nrepl-server! stop-nrepl-server! test-nrepl-server-port]]
            [dirac.test.logging :as logging]
            [dirac.test.settings :refer [get-test-nrepl-server-port]]
            [clojure.tools.logging :as log]))

(def log-level "INFO")                                                                                                        ; INFO, DEBUG, TRACE, ALL
(def last-msg (volatile! nil))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(def current-nrepl-server (atom nil))
(def current-nrepl-server-port (atom nil))

(defn setup-nrepl-server []
  (logging/setup-logging! {:log-out   :console
                           :log-level log-level})
  (log/info "setup-nrepl-server")
  (if-let [[server port] (start-nrepl-server! (get-test-nrepl-server-port))]
    (do
      (log/info "nrepl server started on" port)
      (reset! current-nrepl-server server)
      (reset! current-nrepl-server-port port))
    (log/error "nREPL server start timeouted/failed")))

(defn teardown-nrepl-server []
  (log/info "teardown-nrepl-server")
  (when-let [current-server @current-nrepl-server]
    (stop-nrepl-server! current-server)
    (log/info "nrepl server on" @current-nrepl-server-port "stopped")
    (reset! current-nrepl-server nil)
    (reset! current-nrepl-server-port nil)))

(defn with-nrepl-server [f]
  (setup-nrepl-server)
  (f)
  (teardown-nrepl-server))