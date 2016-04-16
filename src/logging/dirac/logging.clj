(ns dirac.logging
  (:require [dirac.logging.utils :as utils]
            [dirac.lib.utils :as lib-utils]
            [clj-logging-config.log4j :as config]
            [clojure.tools.logging :as log]
            [clansi :refer [style]]))

(def initialized? (volatile! false))

; -- options ----------------------------------------------------------------------------------------------------------------

(defn merge-options [& option-maps]
  (or (apply lib-utils/deep-merge-ignoring-nils option-maps) {}))

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
          :root (merge-options root-options options)
          ; test runners
          "dirac.browser-tests" (merge-options base-options options)
          "dirac.agent-tests" (merge-options base-options options)
          ; test mocks / helpers
          "dirac.test.mock-nrepl-tunnel-client" (merge-options base-options options)
          "dirac.test.mock-weasel-client" (merge-options base-options options)
          ; agent
          "dirac.agent" (merge-options base-options options)
          "dirac.agent-impl" (merge-options base-options options)
          "dirac.agent.logging" (merge-options base-options options)
          "dirac.agent.config" (merge-options base-options options)
          ; nrepl
          "dirac.nrepl" (merge-options nrepl-options options)
          "dirac.nrepl.middleware" (merge-options nrepl-options options)
          "dirac.nrepl.piggieback" (merge-options nrepl-options options)
          ; lib
          "dirac.lib.nrepl-client" (merge-options lib-options options)
          "dirac.lib.nrepl-tunnel" (merge-options lib-options options)
          "dirac.lib.nrepl-tunnel-server" (merge-options lib-options options)
          "dirac.lib.weasel-server" (merge-options lib-options options)
          "dirac.lib.ws-server" (merge-options lib-options options))))))