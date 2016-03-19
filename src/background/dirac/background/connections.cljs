(ns dirac.background.connections
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [dirac.background.action :as action]
            [dirac.background.marion :as marion]
            [dirac.background.state :as state]))

(defn add! [id dirac-tab-id backend-tab-id]
  {:pre [id]}
  (state/add-connection! id {:id             id
                             :dirac-tab-id   dirac-tab-id
                             :backend-tab-id backend-tab-id}))

(defn remove! [id]
  {:pre [id]}
  (state/remove-connection! id))

(defn find-backend-connection [backend-tab-id]
  (let [connections (state/get-connections)]
    (some #(if (= (:backend-tab-id %) backend-tab-id) %) (vals connections))))

(defn find-dirac-connection [dirac-tab-id]
  (let [connections (state/get-connections)]
    (some #(if (= (:dirac-tab-id %) dirac-tab-id) %) (vals connections))))

(defn backend-connected? [backend-tab-id]
  (some? (find-backend-connection backend-tab-id)))

(defn dirac-connected? [dirac-tab-id]
  (some? (find-dirac-connection dirac-tab-id)))

; -- high-level API ---------------------------------------------------------------------------------------------------------

(defn update-action-button-according-to-connection-state! [backend-tab-id]
  {:pre [(number? backend-tab-id)]}
  (if (backend-connected? backend-tab-id)
    (action/update-action-button backend-tab-id :connected "Dirac is connected")
    (action/update-action-button backend-tab-id :waiting "Click to open Dirac DevTools")))

(defn register-connection! [dirac-tab-id backend-tab-id]
  {:pre [(number? dirac-tab-id)
         (number? backend-tab-id)]}
  (let [id (state/get-next-connection-id!)]
    (add! id dirac-tab-id backend-tab-id)
    (marion/post-feedback-event! (str "register dirac connection #" id))
    (update-action-button-according-to-connection-state! backend-tab-id)
    id))

(defn unregister-connection! [dirac-tab-id]
  {:pre [(number? dirac-tab-id)]}
  (if-let [connection (find-dirac-connection dirac-tab-id)]
    (let [{:keys [id backend-tab-id]} connection]
      (remove! id)
      (marion/post-feedback-event! (str "unregister dirac connection #" id))
      (update-action-button-according-to-connection-state! backend-tab-id))
    (warn "attempt to unregister non-existent dirac connection with dirac-tab-id:" dirac-tab-id)))
