(ns dirac.logging.utils
  (:require [clojure.set :refer [rename-keys]]
            [dirac.lib.utils :as lib-utils]
            [clansi :refer [style]]
            [cuerdas.core :as cuerdas])
  (:import (org.apache.log4j Level Layout)
           (org.apache.log4j.spi LoggingEvent)))

(def default-indent 32)
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

(defn standard-formatter [indent prefix-size event & [style-spec prefix]]
  (let [{:keys [renderedMessage loggerName]} event
        friendly-logger-name (prepare-friendly-logger-name loggerName indent)
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

(defn remove-keys-with-nil-val [m]
  (into {} (remove (comp nil? second) m)))

(defn convert-config-to-logging-options [config]
  (-> config
      (select-keys [:log-out :log-level])
      (rename-keys {:log-out   :out
                    :log-level :level})
      (update :level #(if % (Level/toLevel % Level/INFO)))
      (remove-keys-with-nil-val)))

(defn merge-options [& option-maps]
  (or (apply lib-utils/deep-merge-ignoring-nils option-maps) {}))

; https://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/PatternLayout.html
(defn standard-layout [& args]
  {:layout (apply create-layout-adaptor (partial standard-formatter default-indent default-prefix-size) args)})