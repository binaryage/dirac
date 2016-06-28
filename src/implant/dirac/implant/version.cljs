(ns dirac.implant.version
  (:require-macros [dirac.implant.version :refer [get-version]])
  (:require [dirac.implant.helpers :as helpers]))

(defonce version (cond
                   (helpers/should-mock-old-extension-version?) "0.0.1"
                   (helpers/should-mock-future-extension-version?) "1000.0.1"
                   :else (get-version)))
