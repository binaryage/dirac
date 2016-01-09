(ns dirac.agent.utils
  (:require [clojure.pprint :refer [pprint]]
            [clojure.string :as string]))

(defn get-nrepl-server-url [host port]
  (str "nrepl://" host ":" port))

(defn get-ws-url [ip port]
  (str "ws://" ip ":" port))

(defn pp [v]
  (with-out-str (pprint v)))

(defn first-part [s]
  (first (string/split s #"-" 2)))

(defn sid [thing]
  (str "#" (first-part (cond
                         (map? thing) (str (:id thing))
                         (seq? thing) (str (first thing))
                         :else (str thing)))))