(ns dirac.test-lib.nrepl-server
  (:require [dirac.test-lib.nrepl-server-helpers :refer [start-nrepl-server! stop-nrepl-server!]]
            [clojure.tools.logging :as log]
            [dirac.travis :refer [with-travis-fold]]))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(def current-nrepl-server (atom nil))
(def current-nrepl-server-port (atom nil))

(defn setup-nrepl-server! []
  (log/debug "setup-nrepl-server")
  (if-let [[server port] (start-nrepl-server!)]
    (do
      (log/info "nrepl server started on" port)
      (reset! current-nrepl-server server)
      (reset! current-nrepl-server-port port))
    (log/error "nREPL server start timeouted/failed")))

(defn teardown-nrepl-server! []
  (log/debug "teardown-nrepl-server")
  (when-let [current-server @current-nrepl-server]
    (stop-nrepl-server! current-server)
    (log/info "nrepl server on" @current-nrepl-server-port "stopped")
    (reset! current-nrepl-server nil)
    (reset! current-nrepl-server-port nil)))

(defn with-nrepl-server [f]
  (with-travis-fold "Setup nREPL server" "setup-nrepl-server"
    (setup-nrepl-server!))
  (f)
  (with-travis-fold "Tear nREPL server down" "teardown-nrepl-server"
    (teardown-nrepl-server!)))
