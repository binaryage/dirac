(ns dirac.logging
  (:require [dirac.logging.utils :refer [merge-options standard-layout convert-config-to-logging-options standard-layout]]
            [clj-logging-config.log4j :as config]
            [clojure.pprint :as clojure-pprint])
  (:import (org.apache.log4j Level)))

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

(def weasel-options
  (standard-layout :cyan))

; -- public API -------------------------------------------------------------------------------------------------------------

(defn setup! [& [config]]
  (when-not @initialized?
    (vreset! initialized? true)
    (let [options (convert-config-to-logging-options config)]
      (config/set-loggers!
        :root (merge-options root-options options {:level Level/INFO})                                                        ; root level should be always INFO, otherwise we would get very verbosel logs from java libs
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
        "dirac.lib" (merge-options lib-options options)
        "dirac.lib.weasel-server" (merge-options weasel-options options)))))

(defn pprint [data & [level length]]
  (with-out-str
    (binding [*print-level* (or level 5)                                                                                      ; we have to be careful here, data might contain circular references
              *print-length* (or length 200)]
      (clojure-pprint/pprint data))))
