(ns dirac.lib.utils
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.pprint :refer [pprint]]
            [clojure.string :as string]
            [clojure.set :refer [rename-keys]]
            [environ.core :as environ])
  (:import (org.apache.log4j Level)))

(defn get-nrepl-server-url [host port]
  (str "nrepl://" host ":" port))

(defn get-ws-url [host port]
  (str "ws://" host ":" port))

(defn pp [v]
  (with-out-str (pprint v)))

(defn first-part [s]
  (first (string/split s #"-" 2)))

(defn sid [thing]
  (str "#" (first-part (cond
                         (map? thing) (str (:id thing))
                         (seq? thing) (str (first thing))
                         :else (str thing)))))

(defn env-val [key & [type]]
  (if-let [val (environ/env key)]
    (case type
      :bool (or (= val "1")
                (= (string/lower-case val) "true")
                (= (string/lower-case val) "yes"))
      :int (int val)
      (str val))))


(defn assoc-env-val [config ks key & [type]]
  (if-let [val (env-val key type)]
    (assoc-in config ks val)
    config))

; https://en.wikipedia.org/wiki/ANSI_escape_code
(def ^:const ANSI_BLACK 30)
(def ^:const ANSI_RED 31)
(def ^:const ANSI_GREEN 32)
(def ^:const ANSI_YELLOW 33)
(def ^:const ANSI_BLUE 34)
(def ^:const ANSI_MAGENTA 35)
(def ^:const ANSI_CYAN 36)
(def ^:const ANSI_WHITE 37)

(defn wrap-with-ansi-color [color s]
  (str "\u001b[0;" color "m" s "\u001b[m"))

(defn deep-merge-ignoring-nils
  "Recursively merges maps. If keys are not maps, the last value wins. Nils are ignored."
  [& vals]
  (let [non-nil-vals (remove nil? vals)]
    (if (every? map? non-nil-vals)
      (apply merge-with deep-merge-ignoring-nils non-nil-vals)
      (last non-nil-vals))))

(defn remove-keys-with-nil-val [m]
  (into {} (remove (comp nil? second) m)))

(defn config->logging-options [config]
  (-> config
      (select-keys [:log-out :log-level])
      (rename-keys {:log-out   :out
                    :log-level :level})
      (update :level #(if % (Level/toLevel % Level/INFO)))
      (remove-keys-with-nil-val)))

(defn make-logging-options [& option-maps]
  (or (apply deep-merge-ignoring-nils option-maps) {}))

(defn get-status-set [message]
  (let [status (:status message)]
    (into #{} status)))

(defn wait-for-all-responses! [responses-channel]
  (loop []
    (if (<!! responses-channel)
      (recur))))