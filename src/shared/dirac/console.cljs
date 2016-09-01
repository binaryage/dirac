(ns dirac.console
  (:require [goog.log :as glog])
  (:import goog.debug.Console))

; taken from https://gist.github.com/caskolkm/39d823f5bac7051d3062

(def logger
  (glog/getLogger "app"))

(def levels {:severe  goog.debug.Logger.Level.SEVERE
             :warning goog.debug.Logger.Level.WARNING
             :info    goog.debug.Logger.Level.INFO
             :config  goog.debug.Logger.Level.CONFIG
             :fine    goog.debug.Logger.Level.FINE
             :finer   goog.debug.Logger.Level.FINER
             :finest  goog.debug.Logger.Level.FINEST})

(defn log-to-console! []
  (.setCapturing (goog.debug.Console.) true))

(defn set-level! [level]
  (.setLevel logger (get levels level (:info levels))))
