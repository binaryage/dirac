(ns dirac.lib.utils
  (:require [clojure.pprint :refer [pprint]]
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