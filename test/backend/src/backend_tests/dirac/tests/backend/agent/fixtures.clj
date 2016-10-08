(ns dirac.tests.backend.agent.fixtures
  (:require [clojure.tools.logging :as log]
            [dirac.settings :refer [get-backend-tests-nrepl-server-host
                                    get-backend-tests-nrepl-server-port]]
            [dirac.test-lib.nrepl-server-helpers :refer [start-nrepl-server! stop-nrepl-server!]]))

(def current-nrepl-server (atom nil))
(def current-nrepl-server-port (atom nil))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(defn start-test-nrepl-server! []
  (log/debug "setup-tests")
  (if-let [[server port] (start-nrepl-server! (get-backend-tests-nrepl-server-host) (get-backend-tests-nrepl-server-port))]
    (do
      (log/info "nrepl server started on" port)
      (reset! current-nrepl-server server)
      (reset! current-nrepl-server-port port))
    (log/error "nREPL server start timeouted/failed")))

(defn teardown-test-nrepl-server! []
  (log/debug "teardown-tests")
  (when-let [current-server @current-nrepl-server]
    (stop-nrepl-server! current-server)
    (log/info "nrepl server stopped on" @current-nrepl-server-port)
    (reset! current-nrepl-server nil)
    (reset! current-nrepl-server-port nil)))

; -- public setup function --------------------------------------------------------------------------------------------------

(defn setup-test-nrepl-server! [f]
  (start-test-nrepl-server!)
  (f)
  (teardown-test-nrepl-server!))
