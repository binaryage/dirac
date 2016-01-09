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

(defn get-agent-info [agent]
  (let [tunnel (get-tunnel agent)]
    (nrepl-tunnel/get-tunnel-info tunnel)))

; -- lower-level api --------------------------------------------------------------------------------------------------------

(defn create-tunnel! [config]
  (let [effective-config (config/get-effective-config config)]
    (nrepl-tunnel/create! effective-config)))

(defn destroy-tunnel! [tunnel]
  (nrepl-tunnel/destroy! tunnel))

(defn create-agent! [config]
  (let [tunnel (create-tunnel! config)
        agent (make-agent tunnel)]
    agent))

(defn destroy-agent! [agent]
  (let [tunnel (get-tunnel agent)]
    (destroy-tunnel! tunnel)))

; -- high-level api ---------------------------------------------------------------------------------------------------------

; for ease of use from REPL we support only one active agent
; if you need more agents, use low-level API to do that

(def current-agent (atom nil))

(defn live? []
  (not (nil? @current-agent)))

(defn destroy! []
  (when (live?)
    (destroy-agent! @current-agent)
    (reset! current-agent nil)
    (not (live?))))

(defn create! [config]
  (when (live?)
    (destroy!))
  (reset! current-agent (create-agent! config))
  (live?))

(defn boot-now! [config]
  (let [effective-config (config/get-effective-config config)
        {:keys [max-boot-trials delay-between-boot-trials]} effective-config]
    (loop [trial 1]
      (if (<= trial max-boot-trials)
        (let [result (try
                       (log/info (str "Starting Dirac Agent (attempt #" trial ")"))
                       (create! config)
                       (catch ConnectException _
                         ::retry)                                                                                             ; server might not be online yet
                       (catch Throwable e
                         (log/error "Failed to create Dirac Agent:" e)                                                        ; ***
                         ::error))]
          (case result
            true (let [agent @current-agent]
                   (assert agent)
                   (log/info "Started Dirac Agent" (str agent))
                   (println (str "Started Dirac Agent: " (get-agent-info agent)))
                   true)                                                                                                      ; success
            false (do
                    (log/error "Failed to start Dirac Agent.")
                    false)
            ::error false                                                                                                     ; error was already reported by ***
            ::retry (do
                      (Thread/sleep delay-between-boot-trials)
                      (recur (inc trial)))))
        (let [trial-period-in-seconds (/ (* max-boot-trials delay-between-boot-trials) 1000)
              {:keys [host port]} (:nrepl-server effective-config)]
          (log/error (str "Failed to start Dirac Agent. "
                          "Reason: nREPL server didn't come online in time. "
                          "Made " max-boot-trials " connection attempts over last "
                          (format "%.2f" (double trial-period-in-seconds)) " seconds. "
                          "Did you really start your nREPL server on " (utils/get-nrepl-server-url host port) "? "
                          "Maybe a firewall problem?"))
          false)))))

(defn boot!
  "Attempts to boot the Dirac Agent.

  We want to make this function robust and safe to be called by :repl-options :init (Leiningen).
  It runs on a separate thread and waits there for nREPL server to come online.

  The problem with `lein repl` :init config is that it is evaluated before nREPL fully starts.
  Actually it waits for this init code to fully evaluate before starting nREPL server."
  [& [config]]
  (if-not (or (:skip-logging-setup config) (config/env-val :dirac-agent-skip-logging-setup))
    (logging/setup-logging!))
  (log/info "Booting Dirac Agent...")
  (future (boot-now! config))
  true)

; -- support for booting into CLJS REPL -------------------------------------------------------------------------------------

(defn pre-connect [session repl-env ip port]
  (nrepl-tunnel/request-weasel-connection (get-tunnel @current-agent) session ip port))                                       ; TODO: this must be done without dependency on global state

(defn boot-cljs-repl! [session]
  (let [repl-env (weasel-server/repl-env {:ip          "0.0.0.0"
                                          :port        9001
                                          :pre-connect (partial pre-connect session)})]
    (piggieback/cljs-repl repl-env)))