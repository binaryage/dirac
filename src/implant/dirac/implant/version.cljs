(ns dirac.implant.version
  (:require-macros [dirac.implant.version :refer [get-version]])
  (:require [dirac.implant.options :as options]))

(defonce version (cond
                   (options/should-mock-old-extension-version?) "0.0.1"
                   (options/should-mock-future-extension-version?) "1000.0.1"
                   :else (get-version)))
