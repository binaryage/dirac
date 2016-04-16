(ns dirac.logging.utils
  (:require [clojure.set :refer [rename-keys]])
  (:import (org.apache.log4j Level)))

(defn remove-keys-with-nil-val [m]
  (into {} (remove (comp nil? second) m)))

(defn config->logging-options [config]
  (-> config
      (select-keys [:log-out :log-level])
      (rename-keys {:log-out   :out
                    :log-level :level})
      (update :level #(if % (Level/toLevel % Level/INFO)))
      (remove-keys-with-nil-val)))
