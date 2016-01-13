(ns dirac.agent
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.logging :as log]
            [dirac.agent.logging :as logging]
            [dirac.agent.config :as config]
            [dirac.lib.nrepl-tunnel :as nrepl-tunnel]
            [dirac.lib.utils :as utils])
  (:import (java.net ConnectException)))

(defn ^:dynamic failed-to-start-dirac-agent-message [max-boot-trials trial-display nrepl-server-url]
  (str "Failed to start Dirac Agent. "
       "The nREPL server didn't come online in time. Made " max-boot-trials " connection attempts "
       "over last " trial-display " seconds. Did you really start your nREPL server at " nrepl-server-url "? "
       "Maybe a firewall problem?"))

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
                   (log/debug "Started Dirac Agent" (str agent))
                   (println (str "Started Dirac Agent: " (get-agent-info agent)))
                   true)                                                                                                      ; success
            false (do
                    (log/error "Failed to start Dirac Agent.")
                    false)
            ::error false                                                                                                     ; error was already reported by ***
            ::retry (do
                      (Thread/sleep delay-between-boot-trials)
                      (recur (inc trial)))))
        (let [{:keys [host port]} (:nrepl-server effective-config)
              nrepl-server-url (utils/get-nrepl-server-url host port)
              trial-period-in-seconds (/ (* max-boot-trials delay-between-boot-trials) 1000)
              trial-display (format "%.2f" (double trial-period-in-seconds))]
          (log/error (failed-to-start-dirac-agent-message max-boot-trials trial-display nrepl-server-url))
          false)))))

; -- entry point ------------------------------------------------------------------------------------------------------------

(defn boot!
  "Attempts to boot the Dirac Agent.

  We want to make this function robust and safe to be called by :repl-options :init (Leiningen).
  It runs on a separate thread and waits there for nREPL server to come online.

  The problem with `lein repl` :init config is that it is evaluated before nREPL fully starts.
  Actually it waits for this init code to fully evaluate before starting nREPL server."
  [& [config]]
  (if-not (or (:skip-logging-setup config) (utils/env-val :dirac-agent-skip-logging-setup))
    (logging/setup-logging!))
  (log/info "Booting Dirac Agent...")
  (future (boot-now! config))
  true)