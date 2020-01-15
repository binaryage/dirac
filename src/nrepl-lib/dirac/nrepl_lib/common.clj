(ns dirac.nrepl-lib.common
  (:require [clojure.pprint :refer [pprint]]
            [clojure.string :as string]))

(defn get-nrepl-server-url [host port]
  (str "nrepl://" host ":" port))

(defn get-ws-url [host port]
  (str "ws://" host ":" port))

(defn first-part [s]
  (first (string/split s #"-" 2)))

(defn sid [thing]
  (str "#" (first-part (cond
                         (map? thing) (str (:id thing))
                         (seq? thing) (str (first thing))
                         :else (str thing)))))

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
