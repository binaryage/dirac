(ns dirac.test-lib.shadow-cljs
  (:require [clojure.tools.logging :as log]
            [dirac.shared.travis :refer [with-travis-fold]]
            [shadow.cljs.devtools.api :as shadow-api]
            [shadow.cljs.devtools.server :as shadow-server]
            [dirac.lib.utils :as utils]))

; -- fixtures ---------------------------------------------------------------------------------------------------------------

(defn setup-shadow-server! []
  (log/debug "setup-shadow-server\n" (utils/pp (shadow-api/get-config) 10))
  (shadow-server/start!)
  (shadow-api/watch :scenarios04))

(defn teardown-shadow-server! []
  (log/debug "teardown-shadow-server")
  (shadow-server/stop!))

(defn with-shadow-server [f]
  (with-travis-fold "Setup shadow server" "setup-shadow-server"
    (setup-shadow-server!))
  (f)
  (with-travis-fold "Tear shadow server down" "teardown-shadow-server"
    (teardown-shadow-server!)))
