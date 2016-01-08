(ns dirac.agent
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.logging :as log]
            [dirac.agent.logging :as logging]
            [dirac.agent.config :as config]
            [dirac.agent.utils :as utils]
            [dirac.agent.weasel-server :as weasel-server]
            [dirac.agent.nrepl-tunnel :as nrepl-tunnel]
            [dirac.nrepl.piggieback :as piggieback])
  (:import (java.net ConnectException)))

; -- agent construction / access --------------------------------------------------------------------------------------------

(defn make-agent [tunnel]
  {:tunnel tunnel})

(defn get-tunnel [agent]
  (:tunnel agent))

; -- lower-level api --------------------------------------------------------------------------------------------------------

(defn start-tunnel! [config]
  (let [effective-config (config/get-effective-config config)]
    (nrepl-tunnel/create! effective-config)))

(defn stop-tunnel! [tunnel]
  (nrepl-tunnel/destroy! tunnel))

(defn start-agent! [config]
  (let [tunnel (start-tunnel! config)
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

(defn start! [config]
  (reset! current-agent (start-agent! config))
  (live?))

(defn stop! []
  (stop-agent! @current-agent)
  (reset! current-agent nil)
  (not (live?)))

(defn direct-boot! [config]
  (let [effective-config (config/get-effective-config config)
        {:keys [max-boot-trials delay-between-boot-trials host port]} effective-config]
    (loop [trial 1]
      (if (<= trial max-boot-trials)
        (let [result (try
                       (log/info (str "Starting Dirac Agent (attempt #" trial ")"))
                       (start! config)
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
                      (Thread/sleep delay-between-boot-trials)
                      (recur (inc trial)))))
        (let [trial-period-in-seconds (/ (* max-boot-trials delay-between-boot-trials) 1000)]
          (log/error (str "Failed to start Dirac nREPL Agent. "
                          "Reason: nREPL server didn't come online in time. "
                          "Made " max-boot-trials " connection attempts to " (utils/get-nrepl-server-url host port)
                          " over last " (format "%.2f" (double trial-period-in-seconds)) " seconds. "
                          "Did you really start your nREPL server? Maybe a firewall problem?"))
          false)))))

(defn boot!
  "Attempts to boot the Dirac Agent.

  We want to make this function robust and safe to be called by :repl-options :init (Leiningen).
  It runs on a separate thread and waits there for nREPL server to come online.

  The problem with `lein repl` :init config is that it is evaluated before nREPL fully starts. It waits for
  this init code to fully evaluate before starting nREPL server."
  [& [config]]
  (if-not (or (:skip-logging-setup config) (config/env-val :dirac-agent-skip-logging-setup))
    (logging/setup-logging!))
  (log/info "Booting Dirac Agent...")
  (future (direct-boot! config))
  true)

; -- support for booting into CLJS REPL -------------------------------------------------------------------------------------

(defn pre-connect [session repl-env ip port]
  (nrepl-tunnel/request-weasel-connection (get-tunnel @current-agent) session ip port))                                       ; TODO: this must be done without dependency on global state

(defn boot-cljs-repl! [session]
  (let [repl-env (weasel-server/repl-env {:ip          "0.0.0.0"
                                          :port        9001
                                          :pre-connect (partial pre-connect session)})]
    (piggieback/cljs-repl repl-env)))