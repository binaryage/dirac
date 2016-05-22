(ns dirac.utils
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan close!]]
            [cljs.core.async.impl.protocols :as async-protocols]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]))

(deftype ErrorWrapper [message stack])

(def Promise (oget js/window "Promise"))

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
  (if (integer? v)
    v
    (js/parseInt (str v) 10)))

(defn compact [coll]
  (cond
    (vector? coll) (into [] (filter (complement nil?) coll))
    (map? coll) (into {} (filter (comp not nil? second) coll))))

(defn handle-promised-result! [channel result]
  (if (some? result)
    (put! channel result)
    (close! channel)))

(defn turn-promise-into-channel [promise]
  (let [channel (chan)]
    (ocall promise "then" (partial handle-promised-result! channel))
    channel))

(defn turn-channel-into-callback [channel callback]
  (go-loop []
    (if-let [val (<! channel)]
      (do
        (callback val)
        (recur)))))

(defn turn-promise-into-callback [promise callback]
  (ocall promise "then" callback))

(defn turn-callback-into-channel [callback]
  (assert false "turn-callback-into-channel NOT IMPLEMENTED!"))                                                               ; TODO: can we implement this? maybe using ES6 decorators

(defn to-channel [o]
  (cond
    (satisfies? async-protocols/Channel o) o
    (instance? Promise o) (turn-promise-into-channel o)
    (fn? o) (turn-callback-into-channel o)                                                                                    ; assume callback
    :else (go o)))

(defn to-callback [o callback]
  {:pre [(or (fn? callback) (nil? callback))]}
  (if (some? callback)
    (cond
      (satisfies? async-protocols/Channel o) (turn-channel-into-callback o callback)
      (instance? Promise o) (turn-promise-into-callback o callback)
      (fn? o) o                                                                                                               ; assume already a callback
      :else (callback o)))
  nil)

(defn round [n k]
  (/ (js/Math.round (* k n)) k))

(defn timeout-display [time-ms]
  {:pre [(number? time-ms)]}
  (str (round (/ time-ms 1000) 10) "s"))

(defn get-error-msg [e]
  (try
    (str (oget e "message"))
    (catch :default e
      (str "unable to retrieve error message:" e))))

; TODO: this should try to apply source-mapping
(defn get-error-stack [e]
  (try
    (str (oget e "stack"))
    (catch :default e
      (str "unable to print stack: " e))))

(defn make-error-struct [e]
  [:error (get-error-msg e) (get-error-stack e)])

(defn make-result-struct
  ([] (make-result-struct nil))
  ([v] [:result (or v :ok)]))
