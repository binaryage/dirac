(ns dirac.logging
  (:require [dirac.logging.utils :refer [merge-options standard-layout convert-config-to-logging-options standard-layout]]
            [clj-logging-config.log4j :as config]
            [clojure.tools.logging :as log]))

(def initialized? (volatile! false))

; -- options ----------------------------------------------------------------------------------------------------------------

(def root-options
  (standard-layout :default))

(def base-options
  (standard-layout :yellow))

(def lib-options
  (standard-layout :blue))

(def nrepl-options
  (standard-layout :green))

(def tests-options
  (standard-layout :magenta))

; -- public API -------------------------------------------------------------------------------------------------------------

(defn setup! [& [config]]
  (if @initialized?
    (log/warn "dirac.logging/setup! already called => ignoring this call")
    (do
      (vreset! initialized? true)
      (let [options (convert-config-to-logging-options config)]
        (config/set-loggers!
          :root (merge-options root-options options)
          ; test runners
          "dirac.browser-tests" (merge-options tests-options options)
          "dirac.agent-tests" (merge-options tests-options options)
          ; test mocks / helpers
          "dirac.test" (merge-options tests-options options)
          ; agent
          "dirac.agent" (merge-options base-options options)
          "dirac.agent-impl" (merge-options base-options options)
          ; nrepl
          "dirac.nrepl" (merge-options nrepl-options options)
          ; lib
          "dirac.logging" (merge-options lib-options options)
          "dirac.lib" (merge-options lib-options options))))))