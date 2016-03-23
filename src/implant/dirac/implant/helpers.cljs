(ns dirac.implant.helpers
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]))

(defn get-query-param [name]
  (if-let [runtime (oget js/window "Runtime")]
    (ocall runtime "queryParam" name)
    (throw (ex-info "Unable to obtain window.Runtime from DevTools" nil))))

(defn get-connection-id []
  (or (int (get-query-param "connection_id")) 0))

(defn get-console-view []
  (if-let [console-panel (oget js/window "WebInspector" "ConsolePanel")]
    (if-let [console-view (ocall console-panel "_view")]
      console-view
      (throw (ex-info "Unable to obtain console view from DevTools" nil)))
    (throw (ex-info "Unable to obtain console panel from DevTools" nil))))

(defn get-inspector-view []
  (if-let [inspector-view (oget js/window "WebInspector" "inspectorView")]
    inspector-view
    (throw (ex-info "Unable to obtain WebInspector.inspectorView" nil))))

(defn get-el-by-id [id]
  (.getElementById js/document id))