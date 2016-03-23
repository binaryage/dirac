(ns marion.background.clients
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [marion.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan timeout]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.protocols :refer [post-message! get-sender]]
            [marion.background.feedback :as feedback]))

; clients are marion content scripts connected to this marion background page:
;   * some clients may be scenario pages
;   * up to one client should be the current task runner

(defonce clients (atom []))

; -- clients manipulation ---------------------------------------------------------------------------------------------------

(defn add-client! [client]
  (let [sender (get-sender client)
        sender-url (oget sender "url")]
    (log (str "a client connected: " sender-url) sender)
    (swap! clients conj client)))

(defn remove-client! [client]
  (let [sender (get-sender client)
        sender-url (oget sender "url")]
    (feedback/unsubscribe-client-if-subscribed! client)
    (log (str "a client disconnected: " sender-url) sender)
    (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
      (swap! clients remove-item client))))