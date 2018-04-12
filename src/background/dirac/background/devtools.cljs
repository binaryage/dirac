(ns dirac.background.devtools
  (:require [oops.core :refer [oget ocall oapply]]
            [dirac.background.logging :refer [log info warn error]]
            [dirac.background.action :as action]
            [dirac.background.marion :as marion]
            [dirac.background.state :as state]))

(defn add! [id frontend-tab-id backend-tab-id]
  {:pre [id]}
  (state/add-devtools-descriptor! id {:id              id
                                      :frontend-tab-id frontend-tab-id
                                      :backend-tab-id  backend-tab-id}))

(defn remove! [id]
  {:pre [id]}
  (state/remove-devtools-descriptor! id))

(defn find-devtools-descriptor-for-backend-tab [backend-tab-id]
  (let [descriptors (state/get-devtools-descriptors)]
    (some #(if (= (:backend-tab-id %) backend-tab-id) %) (vals descriptors))))

(defn find-devtools-descriptor-for-frontend-tab [frontend-tab-id]
  (let [descriptors (state/get-devtools-descriptors)]
    (some #(if (= (:frontend-tab-id %) frontend-tab-id) %) (vals descriptors))))

(defn backend-connected? [backend-tab-id]
  (some? (find-devtools-descriptor-for-backend-tab backend-tab-id)))

(defn frontend-connected? [frontend-tab-id]
  (some? (find-devtools-descriptor-for-frontend-tab frontend-tab-id)))

; -- high-level API ---------------------------------------------------------------------------------------------------------

(defn go-update-action-button! [backend-tab-id]
  {:pre [(number? backend-tab-id)]}
  (if (backend-connected? backend-tab-id)
    (action/go-update-action-button! backend-tab-id :connected "Dirac is connected")
    (action/go-update-action-button! backend-tab-id :waiting "Click to open Dirac DevTools")))

(defn register! [frontend-tab-id backend-tab-id]
  {:pre [(number? frontend-tab-id)
         (number? backend-tab-id)]}
  (let [id (state/get-next-devtools-id!)]
    (add! id frontend-tab-id backend-tab-id)
    (marion/post-feedback-event! (str "register devtools #" id))
    (go-update-action-button! backend-tab-id)
    id))

(defn unregister! [frontend-tab-id]
  {:pre [(number? frontend-tab-id)]}
  (if-some [descriptor (find-devtools-descriptor-for-frontend-tab frontend-tab-id)]
    (let [{:keys [id backend-tab-id]} descriptor]
      (remove! id)
      (marion/post-feedback-event! (str "unregister devtools #" id))
      (go-update-action-button! backend-tab-id))
    (warn "attempt to unregister non-existent devtools with tab-id:" frontend-tab-id)))
