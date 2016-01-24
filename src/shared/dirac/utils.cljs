(ns dirac.utils
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]))

(defn escape-double-quotes [s]
  (.replace s #"\"" "\\\""))

(defn remove-nil-values [m]
  (into {} (remove (comp nil? second) m)))

(def ^:const EXPONENTIAL_BACKOFF_CEILING (* 60 1000))

(defn exponential-backoff-ceiling [attempt]
  (let [time (* (js/Math.pow 2 attempt) 1000)]
    (js/Math.min time EXPONENTIAL_BACKOFF_CEILING)))
