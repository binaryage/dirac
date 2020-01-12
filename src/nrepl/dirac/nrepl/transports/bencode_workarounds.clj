(ns dirac.nrepl.transports.bencode-workarounds
  (:require [clojure.tools.logging :as log]
            [nrepl.transport :as nrepl-transport]
            [dirac.nrepl-lib.bencode-hell :as bencode-hell]
            [dirac.nrepl.debug :as debug])
  (:import (nrepl.transport Transport)))

; we have to invent our own encoding/decoding scheme for values which bencode cannot safely transfer
; see dirac.nrepl-lib.bencode-hell
;
; please note that if user is not using bencode transport but replace it with something sane, this workaround won't break it

; -- transport wrapper ------------------------------------------------------------------------------------------------------

(defrecord BencodeWorkaroundsTransport [nrepl-message transport]
  Transport
  (recv [_this timeout]
    (let [dirty-message (nrepl-transport/recv transport timeout)
          clean-message (bencode-hell/decode-poo dirty-message)]
      clean-message))
  (send [_this reply-message]
    (let [clean-message reply-message
          dirty-message (bencode-hell/encode-poo clean-message)]
      (nrepl-transport/send transport dirty-message))))

; -- public interface -------------------------------------------------------------------------------------------------------

(defn make-nrepl-message-with-bencode-workarounds [nrepl-message]
  (log/trace "make-nrepl-message-with-bencode-workarounds" (debug/pprint-nrepl-message nrepl-message))
  (update nrepl-message :transport (partial ->BencodeWorkaroundsTransport nrepl-message)))
