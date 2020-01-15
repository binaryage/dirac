(ns dirac.config
  (:require [env-config.core :as env-config]
            [dirac.utils :as utils]))

(defn read-env-config [prefix]
  (env-config/make-config-with-logging prefix (utils/get-env-vars)))
