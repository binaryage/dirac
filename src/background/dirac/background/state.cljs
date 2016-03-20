(ns dirac.background.state
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.protocols :refer [post-message! get-sender get-name]]))

(def initial-state
  {:last-connection-id   0
   :connections          {}                                                                                                   ; pairings between dirac instances and connected backend tabs
   :chrome-event-channel nil
   :marion-port          nil})

(defonce state (atom initial-state))

(defn set-chrome-event-channel! [new-channel]
  (swap! state assoc :chrome-event-channel new-channel))

(defn get-chrome-event-channel []
  (:chrome-event-channel @state))

(defn set-marion-port! [new-marion-port]
  (swap! state assoc :marion-port new-marion-port))

(defn get-marion-port []
  (:marion-port @state))

(defn get-next-connection-id! []
  (:last-connection-id (swap! state update :last-connection-id inc)))

(defn get-connections []
  (:connections @state))

(defn add-connection! [id connection]
  {:pre [(integer? id)]}
  (swap! state update :connections assoc id connection))

(defn remove-connection! [id]
  (swap! state update :connections dissoc id))

(defn get-connection [id]
  (let [connections (get-connections)]
    (get connections (int id))))

(defn reset-connection-id-counter! []
  (if-not (zero? (count (get-connections)))
    (warn "request to reset connection id counter while having connections present" (get-connections)))
  (swap! state assoc :last-connection-id 0))

; -- marion feedback --------------------------------------------------------------------------------------------------------

(defn post-feedback-event! [text]
  (if-let [marion-port (get-marion-port)]
    (post-message! marion-port #js {:type "dirac-extension-feedback-event" :text text})))