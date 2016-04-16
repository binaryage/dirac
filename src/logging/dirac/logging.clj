(ns dirac.logging
  (:require [dirac.logging.utils :as utils]
            [clj-logging-config.log4j :as config]
            [clojure.tools.logging :as log]))

(def initialized? (volatile! false))

; -- options ----------------------------------------------------------------------------------------------------------------

(def root-options
  {:pattern (str (style "_ %m" :default) "%n")})

(def base-options
  {:pattern (str (style "%m" :yellow) "%n")})

(def lib-options
  {:pattern (str (style "%m" :blue) "%n")})

(def nrepl-options
  {:pattern (str (style "%m" :green) "%n")})

; -- public API -------------------------------------------------------------------------------------------------------------

(defn setup! [& [config]]
  (if @initialized?
    (log/warn "dirac.logging/setup! already called => ignoring this call")
    (do
      (vreset! initialized? true)
      (let [options (utils/config->logging-options config)]
        (println "logging setup")
        (config/set-loggers!
          :root (utils/make-logging-options root-options options)
          ; test runners
          "dirac.browser-tests" (utils/make-logging-options base-options options)
          "dirac.agent-tests" (utils/make-logging-options base-options options)
          ; test mocks / helpers
          "dirac.test.mock-nrepl-tunnel-client" (utils/make-logging-options base-options options)
          "dirac.test.mock-weasel-client" (utils/make-logging-options base-options options)
          ; agent
          "dirac.agent" (utils/make-logging-options base-options options)
          "dirac.agent-impl" (utils/make-logging-options base-options options)
          "dirac.agent.logging" (utils/make-logging-options base-options options)
          "dirac.agent.config" (utils/make-logging-options base-options options)
          ; nrepl
          "dirac.nrepl" (utils/make-logging-options nrepl-options options)
          "dirac.nrepl.middleware" (utils/make-logging-options nrepl-options options)
          "dirac.nrepl.piggieback" (utils/make-logging-options nrepl-options options)
          ; lib
          "dirac.lib.nrepl-client" (utils/make-logging-options lib-options options)
          "dirac.lib.nrepl-tunnel" (utils/make-logging-options lib-options options)
          "dirac.lib.nrepl-tunnel-server" (utils/make-logging-options lib-options options)
          "dirac.lib.weasel-server" (utils/make-logging-options lib-options options)
          "dirac.lib.ws-server" (utils/make-logging-options lib-options options))))))