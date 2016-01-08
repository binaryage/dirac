(ns dirac.agent
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [dirac.agent.weasel-server :as weasel-server]
            [dirac.agent.nrepl-tunnel :as nrepl-tunnel]
            [dirac.nrepl.piggieback :as piggieback]))

(def nrepl-tunnel-server-default-options
  {:ip   "0.0.0.0"
   :port 9050})

(def nrepl-client-default-options
  {:host "0.0.0.0"
   :port 9010})

; -- lower-level api --------------------------------------------------------------------------------------------------------

(defn start-tunnel! [& [nrepl-client-options nrepl-tunnel-server-options]]
  (let [nrepl-client-options (merge nrepl-client-default-options nrepl-client-options)
        nrepl-tunnel-server-options (merge nrepl-tunnel-server-default-options nrepl-tunnel-server-options)]
    (nrepl-tunnel/start! nrepl-client-options nrepl-tunnel-server-options)))

(defn stop-tunnel! [tunnel]
  (nrepl-tunnel/stop! tunnel))

; -- high-level api ---------------------------------------------------------------------------------------------------------

; for ease of use from REPL we support only one active tunnel
; if you need more tunnels, use low-level API to do that

(def current-tunnel (atom nil))

(defn start! []
  (when-let [tunnel (start-tunnel!)]
    (reset! current-tunnel tunnel)
    true)
  false)

(defn stop! []
  (when-let [tunnel @current-tunnel]
    (stop-tunnel! tunnel)
    (reset! current-tunnel nil)
    true)
  false)

; -- support for booting into CLJS REPL -------------------------------------------------------------------------------------

(defn pre-connect [session repl-env ip port]
  (nrepl-tunnel/request-weasel-connection @current-tunnel session ip port))

(defn boot-cljs-repl! [session]
  (let [repl-env (weasel-server/repl-env {:ip          "0.0.0.0"
                                          :port        9001
                                          :pre-connect (partial pre-connect session)})]
    (piggieback/cljs-repl repl-env)))

