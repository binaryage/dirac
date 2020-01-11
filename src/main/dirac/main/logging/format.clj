(ns dirac.main.logging.format
  (:require [dirac.main.terminal :refer [style]])
  (:import (org.apache.log4j Layout Level)
           (org.apache.log4j.spi LoggingEvent)))

(defn level->styles [level]
  (case (.toString level)
    "ERROR" [:red]
    "INFO" [:default]
    "DEBUG" [:magenta]
    [:black]))

(defn standard-formatter [event & [_kind]]
  (let [{:keys [renderedMessage level]} event
        style-args (level->styles level)]
    (str (apply style renderedMessage style-args) "\n")))

(defn as-map [^LoggingEvent ev]
  (assoc (bean ev) :event ev))

(defn create-layout-adaptor [f & args]
  (proxy [Layout] []
    (format [ev] (apply f (as-map ev) args))
    (ignoresThrowable [] true)))

; https://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/PatternLayout.html
(defn standard-layout [& args]
  {:layout (apply create-layout-adaptor standard-formatter args)})
