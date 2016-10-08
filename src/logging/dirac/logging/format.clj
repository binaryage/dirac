(ns dirac.logging.format
  (:require [clansi :refer [style]]
            [cuerdas.core :as cuerdas])
  (:import (org.apache.log4j Layout)
           (org.apache.log4j.spi LoggingEvent)))

(def default-indent 48)
(def default-prefix-size 2)

(defn prepare-friendly-logger-name [logger-name indent]
  {:pre [(> indent 3)]}
  (let [truncated-name (if (<= (count logger-name) indent)
                         logger-name
                         (str "..." (cuerdas/slice logger-name (- (- indent 3)))))]
    (cuerdas/pad truncated-name {:length indent
                                 :type   :right})))

(defn prepare-indented-message [message indent]
  (let [indent-str (cuerdas/pad "" {:length indent})]
    (->> message
         (cuerdas/lines)
         (map-indexed (fn [i s] (str (if (pos? i) indent-str "") " | " s)))
         (cuerdas/unlines))))

(defn preprocess-logger-name [logger-name]
  (if-let [m (re-matches #"^dirac\.(.*)" logger-name)]
    (str "⊙." (second m))
    logger-name))

(defn standard-formatter [indent prefix-size event & [style-spec prefix]]
  (let [{:keys [renderedMessage loggerName]} event
        logger-name (preprocess-logger-name loggerName)
        friendly-logger-name (prepare-friendly-logger-name logger-name indent)
        indented-message (prepare-indented-message renderedMessage (+ indent prefix-size))
        massaged-prefix (or (cuerdas/slice prefix 0 prefix-size) "  ")
        style-args (if (coll? style-spec) style-spec [style-spec])]
    (str (apply style (str massaged-prefix friendly-logger-name indented-message) style-args) "\n")))

(defn as-map [^LoggingEvent ev]
  (assoc (bean ev) :event ev))

(defn create-layout-adaptor [f & args]
  (proxy [Layout] []
    (format [ev] (apply f (as-map ev) args))
    (ignoresThrowable [] true)))

; https://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/PatternLayout.html
(defn standard-layout [& args]
  {:layout (apply create-layout-adaptor (partial standard-formatter default-indent default-prefix-size) args)})
