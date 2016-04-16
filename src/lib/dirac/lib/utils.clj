(ns dirac.lib.utils
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.pprint :refer [pprint]]
            [clojure.string :as string]
            [environ.core :as environ]))

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

(defn deep-merge-ignoring-nils
  "Recursively merges maps. If keys are not maps, the last value wins. Nils are ignored."
  [& vals]
  (let [non-nil-vals (remove nil? vals)]
    (if (every? map? non-nil-vals)
      (apply merge-with deep-merge-ignoring-nils non-nil-vals)
      (last non-nil-vals))))

(defn get-status-set [message]
  (let [status (:status message)]
    (into #{} status)))

(defn wait-for-all-responses! [responses-channel]
  (loop []
    (if (<!! responses-channel)
      (recur))))