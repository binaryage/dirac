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
  (if-let [console-view-class (oget js/window "WebInspector" "ConsoleView")]
    (if-let [console-view (ocall console-view-class "instance")]
      console-view
      (throw (ex-info "Unable to obtain ConsoleView instance from DevTools" nil)))
    (throw (ex-info "Unable to obtain WebInspector.ConsoleView from DevTools" nil))))

(defn get-inspector-view []
  (if-let [inspector-view (oget js/window "WebInspector" "inspectorView")]
    inspector-view
    (throw (ex-info "Unable to obtain WebInspector.inspectorView" nil))))

(defn get-el-by-id [id]
  (.getElementById js/document id))