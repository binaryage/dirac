(ns marion.background.clients
  (:require-macros      [devtools.toolbox :refer [envelope]])
  (:require [cljs.core.async :refer [<! chan timeout go go-loop]]
            [oops.core :refer [oget ocall oapply]]
            [chromex.protocols :refer [post-message! get-sender]]
            [marion.background.logging :refer [log info warn error]]
            [marion.background.feedback :as feedback]
            [marion.background.notifications :as notifications]
            [marion.background.helpers :as helpers]))

; clients are marion content scripts connected to this marion background page:
;   * some clients may be scenario pages
;   * up to one client should be the current task runner

(defonce clients (atom []))

; -- clients manipulation ---------------------------------------------------------------------------------------------------

(defn add-client! [client]
  (let [sender (get-sender client)]
    (swap! clients conj client)
    (log (str "a client connected: " (helpers/get-client-url client) " total clients " (count @clients))
         (envelope sender))))

(defn remove-client! [client]
  (let [sender (get-sender client)]
    (feedback/unsubscribe-client-if-subscribed! client)
    (notifications/unsubscribe-client-if-subscribed! client)
    (let [remove-item (fn [coll item] (remove #(identical? item %) coll))]
      (swap! clients remove-item client))
    (log (str "a client disconnected: " (helpers/get-client-url client) " total clients " (count @clients))
         (envelope sender))))
