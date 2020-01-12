(ns dirac.logging.utils
  (:require [clojure.set :refer [rename-keys]]
            [dirac.utils :as utils])
  (:import (org.apache.log4j Level)))

(defn convert-config-to-logging-options [config]
  (-> config
      (select-keys [:log-out :log-level])
      (rename-keys {:log-out   :out
                    :log-level :level})
      (update :level #(if % (Level/toLevel ^String % Level/INFO)))
      (utils/remove-keys-with-nil-val)))

(defn merge-options [& option-maps]
  (or (apply utils/deep-merge-ignoring-nils option-maps) {}))
