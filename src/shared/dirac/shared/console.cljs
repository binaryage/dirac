(ns dirac.shared.console
  (:require [goog.log :as goog-log]
            [goog.debug :as goog-debug]
            [goog.debug.Logger.Level :as level]
            [oops.core :refer [oget oset! ocall ocall! gcall oapply]]))

; taken from https://gist.github.com/caskolkm/39d823f5bac7051d3062

(def logger (goog-log/getLogger "app"))

(def levels
  {:severe  level/SEVERE
   :warning level/WARNING
   :info    level/INFO
   :config  level/CONFIG
   :fine    level/FINE
   :finer   level/FINER
   :finest  level/FINEST})

(defn make-console []
  (goog-debug/Console.))

(defn log-to-console! []
  (ocall! (make-console) "setCapturing" true))

(defn set-level! [level-keyword]
  (let [wanted-level (get levels level-keyword (:info levels))]
    (ocall! logger "setLevel" wanted-level)))
