(ns dirac.agent
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [dirac.agent.weasel-server :as weasel-server]
            [dirac.agent.nrepl-tunnel :as nrepl-tunnel]
            [dirac.nrepl.piggieback :as piggieback]))

(def current-tunnel (atom nil))

(def nrepl-tunnel-server-default-options
  {:ip   "0.0.0.0"
   :port 9050})

(def nrepl-client-default-options
  {:host "0.0.0.0"
   :port 9010})

(defn start-tunnel! [& [nrepl-client-options nrepl-tunnel-server-options]]
  (let [nrepl-client-options (merge nrepl-client-default-options nrepl-client-options)
        nrepl-tunnel-server-options (merge nrepl-tunnel-server-default-options nrepl-tunnel-server-options)]
    (if-let [tunnel (nrepl-tunnel/start! nrepl-client-options nrepl-tunnel-server-options)]
      (reset! current-tunnel tunnel)))
  nil)

(defn pre-connect [repl-env ip port]
  (nrepl-tunnel/request-weasel-connection @current-tunnel ip port))

(defn run-cljs-repl! []
  (let [repl-env (weasel-server/repl-env {:ip          "0.0.0.0"
                                          :port        9001
                                          :pre-connect pre-connect})]
    (piggieback/cljs-repl repl-env)))

(defn start! []
  (start-tunnel!)
  nil)