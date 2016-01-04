(ns dirac.agent
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [dirac.agent.weasel-server :as weasel-server]
            [dirac.agent.nrepl-client :as nrepl-client]
            [dirac.agent.nrepl-tunnel-server :as nrepl-tunnel-server]
            [dirac.nrepl.piggieback :as piggieback]))

(defn start! []
  (nrepl-tunnel-server/run-message-loop!)
  (future (nrepl-tunnel-server/start! {:ip "0.0.0.0"
                                       :port 9050}))
  (when (nrepl-client/connect! {:host "0.0.0.0"
                                :port 9010})
    (println "nrepl-client connected!")
    (nrepl-client/run-message-loop!))
  (println "running weasel server")
  #_(let [repl-env (weasel-server/repl-env :ip "0.0.0.0" :port 9001)]
    (piggieback/cljs-repl repl-env)))

(defn run-cljs-repl! []
  (let [repl-env (weasel-server/repl-env :ip "0.0.0.0" :port 9001)]
    (piggieback/cljs-repl repl-env)))