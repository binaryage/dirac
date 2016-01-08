(ns dirac.agent
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.logging :as log]
            [dirac.agent.logging :refer [setup-logging!]]
            [dirac.agent.weasel-server :as weasel-server]
            [dirac.agent.nrepl-tunnel :as nrepl-tunnel]
            [dirac.nrepl.piggieback :as piggieback])
  (:import (java.net ConnectException)))

(def boot-default-options
  {:max-trials           10
   :delay-between-trials 500})

(def nrepl-tunnel-server-default-options
  {:ip   "localhost"
   :port 9050})

(def nrepl-client-default-options
  {:host "localhost"
   :port 9010})

(defn get-effective-nrepl-client-options [nrepl-client-options]
  (merge nrepl-client-default-options nrepl-client-options))

(defn get-effective-nrepl-tunnel-server-options [nrepl-tunnel-server-options]
  (merge nrepl-tunnel-server-default-options nrepl-tunnel-server-options))

(defn get-effective-boot-options [boot-options]
  (merge boot-default-options boot-options))

(defn get-nrepl-server-url [nrepl-client-options]
  (let [{:keys [host port]} nrepl-client-options]
    (str "nrepl://" host ":" port)))

; -- agent construction / access --------------------------------------------------------------------------------------------

(defn make-agent [tunnel]
  {:tunnel tunnel})

(defn get-tunnel [agent]
  (:tunnel agent))

; -- lower-level api --------------------------------------------------------------------------------------------------------

(defn start-tunnel! [& [nrepl-client-options nrepl-tunnel-server-options]]
  (let [nrepl-client-options (get-effective-nrepl-client-options nrepl-client-options)
        nrepl-tunnel-server-options (get-effective-nrepl-tunnel-server-options nrepl-tunnel-server-options)]
    (nrepl-tunnel/start! nrepl-client-options nrepl-tunnel-server-options)))

(defn stop-tunnel! [tunnel]
  (nrepl-tunnel/stop! tunnel))

(defn start-agent! [& args]
  (let [tunnel (apply start-tunnel! args)
        agent (make-agent tunnel)]
    agent))

(defn stop-agent! [agent]
  (let [tunnel (get-tunnel agent)]
    (stop-tunnel! tunnel)))

; -- high-level api ---------------------------------------------------------------------------------------------------------

; for ease of use from REPL we support only one active agent
; if you need more agents, use low-level API to do that

(def current-agent (atom nil))

(defn live? []
  (not (nil? @current-agent)))

(defn start! [& args]
  (reset! current-agent (apply start-agent! args))
  (live?))

(defn stop! []
  (stop-agent! @current-agent)
  (reset! current-agent nil)
  (not (live?)))

(defn direct-boot! [& [boot-options nrepl-client-options nrepl-tunnel-server-options]]
  (let [effective-boot-options (get-effective-boot-options boot-options)
        effective-nrepl-client-options (get-effective-nrepl-client-options nrepl-client-options)
        {:keys [max-trials delay-between-trials]} effective-boot-options]
    (loop [trial 1]
      (if (<= trial max-trials)
        (let [result (try
                       (log/info (str "Starting Dirac Agent (attempt #" trial ")"))
                       (start! nrepl-client-options nrepl-tunnel-server-options)
                       (catch ConnectException _
                         ::retry)                                                                                             ; server might not be online yet
                       (catch Throwable e
                         (log/error "Failed to boot Dirac Agent:" e)                                                          ; ***
                         ::error))]
          (case result
            true true                                                                                                         ; success
            false (do
                    (log/error "Failed to start Dirac nREPL Agent.")
                    false)
            ::error false                                                                                                     ; error was already reported by ***
            ::retry (do
                      (Thread/sleep delay-between-trials)
                      (recur (inc trial)))))
        (let [nrepl-server-url (get-nrepl-server-url effective-nrepl-client-options)
              trial-period-in-seconds (/ (* max-trials delay-between-trials) 1000)]
          (log/error (str "Failed to start Dirac nREPL Agent. "
                          "Reason: nREPL server didn't come online in time. "
                          "Made " max-trials " connection attempts to " nrepl-server-url
                          " over last " (format "%.2f" (double trial-period-in-seconds)) " seconds. "
                          "Did you really start your nREPL server? Maybe a firewall problem?"))
          false)))))

(defn boot!
  "Attempts to boot the Dirac Agent.

  We want to make this function robust and safe to be called by :repl-options :init (Leiningen).
  It runs on a separate thread and waits there for nREPL server to come online.

  The problem with `lein repl` :init config is that it is evaluated before nREPL fully starts. It waits for
  this init code to fully evaluate before starting nREPL server."
  [& args]
  (setup-logging!)
  (log/info "Booting Dirac Agent...")
  (future (apply direct-boot! args))
  true)

; -- support for booting into CLJS REPL -------------------------------------------------------------------------------------

(defn pre-connect [session repl-env ip port]
  (nrepl-tunnel/request-weasel-connection (get-tunnel @current-agent) session ip port))                                       ; TODO: this must be done without dependency on global state

(defn boot-cljs-repl! [session]
  (let [repl-env (weasel-server/repl-env {:ip          "0.0.0.0"
                                          :port        9001
                                          :pre-connect (partial pre-connect session)})]
    (piggieback/cljs-repl repl-env)))