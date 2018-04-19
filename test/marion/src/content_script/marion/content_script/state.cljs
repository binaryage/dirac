(ns marion.content-script.state
  (:require [marion.content-script.logging :refer [error info log warn]]))

(defonce background-port-atom (atom nil))
(defonce pending-messages-atom (atom []))

(defn get-background-port []
  @background-port-atom)

(defn reset-background-port! [val]
  (reset! background-port-atom val))

(defn flush-pending-messages! [handler]
  (let [messages @pending-messages-atom]
    (when-not (empty? messages)
      (log "flush-pending-messages!" (count messages))
      (reset! pending-messages-atom [])
      (doseq [message messages]
        (handler message)))))

(defn add-pending-message [message]
  (swap! pending-messages-atom conj message))
