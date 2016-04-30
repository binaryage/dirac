(ns dirac.logging
  (:require [dirac.logging.utils :refer [merge-options standard-layout convert-config-to-logging-options standard-layout]]
            [clj-logging-config.log4j :as config]
            [clojure.pprint :as clojure-pprint]))

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
  (when-not @initialized?
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
        "dirac.lib" (merge-options lib-options options)))))

(defn pprint [data]
  (with-out-str
    (binding [*print-level* 5                                                                                                 ; we have to be careful here, data might contain circular references
              *print-length* 30]
      (clojure-pprint/pprint data))))
