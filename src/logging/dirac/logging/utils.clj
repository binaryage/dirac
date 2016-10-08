(ns dirac.logging.utils
  (:require [clojure.set :refer [rename-keys]]
            [dirac.lib.utils :as lib-utils])
  (:import (org.apache.log4j Level Layout)
           (org.apache.log4j.spi LoggingEvent)))

(defn remove-keys-with-nil-val [m]
  (into {} (remove (comp nil? second) m)))

(defn convert-config-to-logging-options [config]
  (-> config
      (select-keys [:log-out :log-level])
      (rename-keys {:log-out   :out
                    :log-level :level})
      (update :level #(if % (Level/toLevel ^String % Level/INFO)))
      (remove-keys-with-nil-val)))

(defn merge-options [& option-maps]
  (or (apply lib-utils/deep-merge-ignoring-nils option-maps) {}))
