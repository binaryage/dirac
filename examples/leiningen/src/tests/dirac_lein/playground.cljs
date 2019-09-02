(ns dirac-lein.playground
  (:require-macros [dirac-lein.logging :refer [log]])
  (:require [goog.i18n.uChar :as u]
            [clojure.string :as s]))

; https://github.com/binaryage/dirac/issues/58
(log "u/toCharCode" u/toCharCode (u/toCharCode "a"))

(log "s/reverse" s/reverse (s/reverse "abc"))
