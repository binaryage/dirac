(ns dirac.utils
  (:require [goog.string :as gstring]
            [goog.string.format]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [clojure.string :as string]))

(defn escape-double-quotes [s]
  (.replace s #"\"" "\\\""))
