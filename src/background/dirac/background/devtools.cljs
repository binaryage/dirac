(ns dirac.background.devtools
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [dirac.background.action :as action]
            [dirac.background.marion :as marion]
            [dirac.background.state :as state]))

(defn add! [id dirac-tab-id backend-tab-id]
  {:pre [id]}
  (state/add-devtools-descriptor! id {:id             id
                                      :dirac-tab-id   dirac-tab-id
                                      :backend-tab-id backend-tab-id}))

(defn remove! [id]
  {:pre [id]}
  (state/remove-devtools-descriptor! id))

(defn find-devtools-descriptor-for-backend-tab [backend-tab-id]
  (let [descriptors (state/get-devtools-descriptors)]
    (some #(if (= (:backend-tab-id %) backend-tab-id) %) (vals descriptors))))

(defn find-devtools-descriptor-for-frontend-tab [dirac-tab-id]
  (let [descriptors (state/get-devtools-descriptors)]
    (some #(if (= (:dirac-tab-id %) dirac-tab-id) %) (vals descriptors))))

(defn backend-connected? [backend-tab-id]
  (some? (find-devtools-descriptor-for-backend-tab backend-tab-id)))

(defn frontend-connected? [dirac-tab-id]
  (some? (find-devtools-descriptor-for-frontend-tab dirac-tab-id)))

; -- high-level API ---------------------------------------------------------------------------------------------------------

(defn update-action-button! [backend-tab-id]
  {:pre [(number? backend-tab-id)]}
  (if (backend-connected? backend-tab-id)
    (action/update-action-button! backend-tab-id :connected "Dirac is connected")
    (action/update-action-button! backend-tab-id :waiting "Click to open Dirac DevTools")))

(defn register! [dirac-tab-id backend-tab-id]
  {:pre [(number? dirac-tab-id)
         (number? backend-tab-id)]}
  (let [id (state/get-next-devtools-id!)]
    (add! id dirac-tab-id backend-tab-id)
    (marion/post-feedback-event! (str "register devtools #" id))
    (update-action-button! backend-tab-id)
    id))

(defn unregister! [dirac-tab-id]
  {:pre [(number? dirac-tab-id)]}
  (if-let [descriptor (find-devtools-descriptor-for-frontend-tab dirac-tab-id)]
    (let [{:keys [id backend-tab-id]} descriptor]
      (remove! id)
      (marion/post-feedback-event! (str "unregister devtools #" id))
      (update-action-button! backend-tab-id))
    (warn "attempt to unregister non-existent devtools with dirac-tab-id:" dirac-tab-id)))