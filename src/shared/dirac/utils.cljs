(ns dirac.utils
  (:require [cljs.core.async :refer [put! <! chan close!]]
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