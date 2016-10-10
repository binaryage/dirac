(ns dirac.agent.impl
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.tools.logging :as log]
            [dirac.logging :as logging]
            [dirac.agent.config :as config]
            [dirac.agent.version :refer [version]]
            [dirac.lib.nrepl-tunnel :as nrepl-tunnel]
            [dirac.lib.utils :as utils])
  (:import (java.net ConnectException)
           (clojure.lang ExceptionInfo)))

(defn ^:dynamic failed-to-start-dirac-agent-message [max-boot-trials trial-display nrepl-server-url]
  (str "Failed to start Dirac Agent. "
       "The nREPL server didn't come online in time. "
       "Made " max-boot-trials " connection attempts over last " trial-display " seconds.\n"
       "Did you really start your nREPL server at " nrepl-server-url "? "
       "Maybe a firewall problem?"))

; -- DiracAgent construction  -----------------------------------------------------------------------------------------------

(defrecord DiracAgent [id options tunnel]
  Object
  (toString [this]
    (str "[DiracAgent#" (:id this) "]")))

(def last-id (volatile! 0))

(defn next-id! []
  (vswap! last-id inc))

(defn make-agent! [options tunnel]
  (let [tunnel (DiracAgent. (next-id!) options tunnel)]
    (log/trace "Made" (str tunnel))
    tunnel))

; -- DiracAgent access ------------------------------------------------------------------------------------------------------

(defn get-tunnel [agent]
  (:tunnel agent))

(defn get-agent-info [agent]
  (let [tunnel (get-tunnel agent)]
    (str "Dirac Agent v" version "\n"
         (nrepl-tunnel/get-tunnel-info tunnel))))

; -- lower-level api --------------------------------------------------------------------------------------------------------

(defn create-tunnel! [config]
  (let [effective-config (config/get-effective-config config)]
    (nrepl-tunnel/create! effective-config)))

(defn destroy-tunnel! [tunnel]
  (nrepl-tunnel/destroy! tunnel))

(defn create-agent! [config]
  (let [tunnel (create-tunnel! config)]
    (make-agent! config tunnel)))

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
        {:keys [max-boot-trials delay-between-boot-trials initial-boot-delay]} effective-config]
    (if (pos? initial-boot-delay)
      (Thread/sleep initial-boot-delay))
    (loop [trial 1]
      (if (<= trial max-boot-trials)
        (let [result (try
                       (log/info (str "Starting Dirac Agent" (if (> trial 1) (str "(attempt #" trial ")"))))
                       (create! config)
                       (catch ExceptionInfo e                                                                                 ; for example missing nREPL middleware
                         (log/error "ERROR:" (.getMessage e))
                         :error)
                       (catch ConnectException _
                         ::retry)                                                                                             ; server might not be online yet
                       (catch Throwable e
                         (log/error "ERROR:" "Failed to create Dirac Agent:\n" e)                                             ; ***
                         ::error))]
          (case result
            true (let [agent @current-agent]
                   (assert agent)
                   (log/debug "Started Dirac Agent" (str agent))
                   (println)
                   (println (get-agent-info agent))
                   true)                                                                                                      ; success
            false (do
                    (log/error "ERROR:" "Failed to start Dirac Agent.")
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
  (let [effective-config (config/get-effective-config config)]
    (if-not (:skip-logging-setup effective-config)
      (logging/setup! effective-config))
    (log/info "Booting Dirac Agent...")
    (log/debug "effective config:\n" (utils/pp effective-config))
    (future (boot-now! config))))
