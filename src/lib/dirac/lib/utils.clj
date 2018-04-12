(ns dirac.lib.utils
  (:require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]
            [clojure.pprint :refer [pprint]]
            [clojure.string :as string]
            [env-config.core :as env-config]))

(defn get-nrepl-server-url [host port]
  (str "nrepl://" host ":" port))

(defn get-ws-url [host port]
  (str "ws://" host ":" port))

(defn pp [data & [level length]]
  (with-out-str
    (binding [*print-level* (or level 5)                                                                                      ; we have to be careful here, data might contain circular references
              *print-length* (or length 200)]
      (pprint data))))

(defn first-part [s]
  (first (string/split s #"-" 2)))

(defn sid [thing]
  (str "#" (first-part (cond
                         (map? thing) (str (:id thing))
                         (seq? thing) (str (first thing))
                         :else (str thing)))))

(defn get-env-vars []
  (-> {}
      (into (System/getenv))
      (into (System/getProperties))))

(defn read-env-config [prefix]
  (env-config/make-config-with-logging prefix (get-env-vars)))

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
    (when (<!! responses-channel)
      (recur))))

(defn exit-with-error! [msg & [exit-code]]
  (binding [*out* *err*]
    (println "-----------------------------------------------------------------------------------------------------------")
    (println "ERROR!")
    (println msg)
    (println "-----------------------------------------------------------------------------------------------------------")
    (System/exit (or exit-code 1))))

(defn print-warning! [& args]
  (binding [*out* *err*]
    (println "-----------------------------------------------------------------------------------------------------------")
    (println "WARNING!")
    (apply println args)
    (println "-----------------------------------------------------------------------------------------------------------")))
