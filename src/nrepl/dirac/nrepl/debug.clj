(ns dirac.nrepl.debug
  (:require [clojure.tools.logging :as log]
            [cuerdas.core :as cuerdas]
            [dirac.utils :as utils])
  (:import (java.io PrintWriter StringWriter)))

(def ^:dynamic *log-stack-traces* false)

(defn drop-first-n-lines [n s]
  (->> s
       (cuerdas/lines)
       (drop n)
       (cuerdas/unlines)))

(defn get-printed-stack-trace []
  (try
    (throw (Throwable. ""))
    (catch Throwable e
      (let [string-writer (StringWriter.)
            writer (PrintWriter. string-writer)]
        (.printStackTrace e writer)
        (drop-first-n-lines 3 (str string-writer))))))

(defmacro log-stack-trace! []
  (when *log-stack-traces*
    `(log/debug (get-printed-stack-trace))))

(defmacro log-stack-trace!! []
  `(log/debug (get-printed-stack-trace)))

(defn pprint-session [session]
  (str "session #" (-> session meta :id)))

(defn pprint-nrepl-message [nrepl-message]
  (let [modified-nrepl-message (assoc nrepl-message :session (pprint-session (:session nrepl-message)))]
    (utils/pp modified-nrepl-message)))
