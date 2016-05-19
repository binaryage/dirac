(ns dirac.utils
  (:require-macros [cljs.core.async.macros :refer [go]])
  (:require [cljs.core.async :refer [put! <! chan close!]]
            [cljs.core.async.impl.protocols :as async-protocols]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]))

(defn escape-double-quotes [s]
  (.replace s #"\"" "\\\""))

(defn remove-nil-values [m]
  (into {} (remove (comp nil? second) m)))

(defonce ^:const EXPONENTIAL_BACKOFF_CEILING (* 60 1000))

(defn exponential-backoff-ceiling [attempt]
  (let [time (* (js/Math.pow 2 attempt) 1000)]
    (js/Math.min time EXPONENTIAL_BACKOFF_CEILING)))

; this implementation differs from core.async timeout that it is simple and creates a new channel for every invocation
; it is safe to call close! on returned channel to cancel timeout early
(defn timeout [msec]
  (let [channel (chan)]
    (.setTimeout js/window #(close! channel) msec)
    channel))

(defn parse-int [v]
  {:pre [(string? v)]}
  (js/parseInt v 10))

(defn compact [coll]
  (cond
    (vector? coll) (into [] (filter (complement nil?) coll))
    (map? coll) (into {} (filter (comp not nil? second) coll))))

(defn turn-promise-into-channel [promise]
  (let [channel (chan)]
    (.then promise #(put! channel %))
    channel))

(defn to-channel [o]
  (cond
    (satisfies? async-protocols/Channel o) o
    (instance? js/Promise o) (turn-promise-into-channel o)
    :else (go o)))