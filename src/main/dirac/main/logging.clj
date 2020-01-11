(ns dirac.main.logging
  (:require [clj-logging-config.log4j :as config]
            [dirac.lib.utils :as lib-utils]
            [dirac.main.logging.format :refer [standard-layout]])
  (:import (org.apache.log4j Level)))

(def initialized? (volatile! false))

(defn merge-options [& option-maps]
  (or (apply lib-utils/deep-merge-ignoring-nils option-maps) {}))

; -- options ----------------------------------------------------------------------------------------------------------------

(def root-options
  (standard-layout :root))

(def main-options
  (standard-layout :main))

(def home-options
  (standard-layout :home))

(def dirac-options
  (standard-layout :dirac))

; -- public API -------------------------------------------------------------------------------------------------------------

(defn setup! [config]
  (assert (not @initialized?))
  (vreset! initialized? true)
  (let [options {:level (Level/toLevel ^String (:log-level config) Level/ERROR)}]
    (config/set-loggers!
      :root (merge-options options root-options {:level Level/ERROR})                                                         ; override level to prevent libraries to spam our output
      "dirac" (merge-options options dirac-options)
      "dirac.main" (merge-options options main-options)
      "dirac.home" (merge-options options home-options))))
