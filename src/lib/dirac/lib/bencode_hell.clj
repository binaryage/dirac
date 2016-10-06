(ns dirac.lib.bencode-hell
  (:require [clojure.walk :refer [postwalk]]
            [clojure.edn :as edn]))

; bencode transport (default for nREPL) cannot be trusted (as of [org.clojure/tools.nrepl "0.2.12"])
; the list of quirks I've discovered so far:
;   1. encoding booleans throws
;   2. nils are decoded as []

; We work around those by encoding broken values as strings with unicode marker (U+1F4A9) "pile of poo" prepended.
; On the nREPL client side, we detect poo markers and decode strings back to clojure values.

; Anyone observing dirac-related nREPL messages should immediatelly spot that something smelly is going on...

; Warning! don't get your hands dirty when working with this code!

(def marker "\uD83D\uDCA9")
(def re-marker (re-pattern (str marker "(.*)")))

; cannot use boolean? with clojure older than 1.9, TODO: remove this before retirement
(defn rly-boolean? [v]
  (or (true? v)
      (false? v)))

(defn broken-value? [v]
  (or (nil? v)
      (rly-boolean? v)))

(defn encode-value [v]
  (pr-str v))

(defn decode-value [v]
  (edn/read-string v))

(defn encoder [v]
  (if (broken-value? v)
    (str marker (encode-value v))
    v))

(defn decoder [v]
  (if (string? v)
    (if-let [m (re-matches re-marker v)]
      (decode-value (second m))
      v)
    v))

(defn encode-poo [message]
  (postwalk encoder message))

(defn decode-poo [message]
  (postwalk decoder message))
