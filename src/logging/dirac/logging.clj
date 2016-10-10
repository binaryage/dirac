(ns dirac.logging
  (:require [dirac.logging.utils :refer [merge-options convert-config-to-logging-options]]
            [dirac.logging.format :refer [standard-layout]]
            [clj-logging-config.log4j :as config]
            [clojure.pprint :as clojure-pprint])
  (:import (org.apache.log4j Level)))

(def initialized? (volatile! false))

; -- options ----------------------------------------------------------------------------------------------------------------

(def root-options
  (standard-layout :black))

(def base-options
  (standard-layout :yellow))

(def lib-options
  (standard-layout :blue))

(def nrepl-options
  (standard-layout :green))

(def tests-options
  (standard-layout :magenta))

(def weasel-options
  (standard-layout :cyan))

; -- public API -------------------------------------------------------------------------------------------------------------

(defn setup! [& [config]]
  (when-not @initialized?
    (vreset! initialized? true)
    (let [options (convert-config-to-logging-options config)]
      (config/set-loggers!
        :root (merge-options root-options options {:level Level/INFO})                                                        ; root level should be always INFO, otherwise we would get very verbose logs from java libs
        ; test runners
        "dirac.tests.browser" (merge-options tests-options options)
        "dirac.tests.backend" (merge-options tests-options options)
        ; test mocks / helpers
        "dirac.test-lib" (merge-options tests-options options)
        ; agent
        "dirac.agent" (merge-options base-options options)
        ; nrepl
        "dirac.nrepl" (merge-options nrepl-options options)
        ; lib
        "dirac.logging" (merge-options lib-options options)
        "dirac.lib" (merge-options lib-options options)
        "dirac.lib.weasel-server" (merge-options weasel-options options)))))
