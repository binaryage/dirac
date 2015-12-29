(ns dirac.background.connections
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [dirac.background.state :refer [state]]
            [dirac.background.action :as action]))

(defn add! [dirac-tab-id backend-tab-id]
  (swap! state update :connections assoc dirac-tab-id {:dirac-tab-id   dirac-tab-id
                                                       :backend-tab-id backend-tab-id}))

(defn remove! [dirac-tab-id]
  (swap! state update :connections dissoc dirac-tab-id))

(defn find-backend-connection [backend-tab-id]
  (let [connections (get @state :connections)]
    (some #(if (= (:backend-tab-id %) backend-tab-id) %) (vals connections))))

(defn get-dirac-connection [dirac-tab-id]
  (let [connections (get @state :connections)]
    (get connections dirac-tab-id)))

(defn backend-connected? [backend-tab-id]
  (not (nil? (find-backend-connection backend-tab-id))))

(defn dirac-connected? [dirac-tab-id]
  (not (nil? (get-dirac-connection dirac-tab-id))))

; -- high-level API ---------------------------------------------------------------------------------------------------------

(defn update-action-button-according-to-connection-state! [backend-tab-id]
  {:pre [(number? backend-tab-id)]}
  (if (backend-connected? backend-tab-id)
    (action/update-action-button backend-tab-id :connected "Dirac is connected")
    (action/update-action-button backend-tab-id :waiting "Click to open Dirac DevTools")))

(defn register-connection! [dirac-tab-id backend-tab-id]
  {:pre [(number? dirac-tab-id)
         (number? backend-tab-id)]}
  (add! dirac-tab-id backend-tab-id)
  (update-action-button-according-to-connection-state! backend-tab-id))

(defn unregister-connection! [dirac-tab-id]
  {:pre [(number? dirac-tab-id)]}
  (when-let [{:keys [backend-tab-id]} (get-dirac-connection dirac-tab-id)]
    (remove! dirac-tab-id)
    (update-action-button-according-to-connection-state! backend-tab-id)))
