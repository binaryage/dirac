(ns dirac.background.connections
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [dirac.background.state :refer [state]]))

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