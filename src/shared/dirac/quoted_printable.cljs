(ns dirac.quoted-printable
  (:require [oops.core :refer [oget oset! ocall oapply gget]]
            [chromex.logging :refer-macros [log info warn error]]))

; taken from
; https://github.com/mathiasbynens/quoted-printable/blob/326f631c9dd0cd051d12ab1b39682a97126b1894/src/quoted-printable.js
; by @mathias | MIT license

(def re-qp-trailing-whitespace (js/RegExp. "\\s+$" "gm"))
(def re-qp-hard-line-breaks (js/RegExp. "=(?:\\n|$)" "g"))
(def re-qp-escaped-sequences (js/RegExp. "=([a-fA-F0-9]{2})" "g"))
(def from-char-code (gget "String.fromCharCode"))

(defn decode-escape-sequence [hex-code-point-str]
  (let [code-point (js/parseInt hex-code-point-str 16)]
    (from-char-code code-point)))

(defn decode-quoted-printable [source]
  (-> source
      (.replace re-qp-trailing-whitespace "")
      (.replace re-qp-hard-line-breaks "")
      (.replace re-qp-escaped-sequences #(decode-escape-sequence %2))))
